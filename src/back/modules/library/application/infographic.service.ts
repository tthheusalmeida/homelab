import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  Optional,
} from '@nestjs/common';

import type {
  LibraryInfographic,
  LibraryInfographicInput,
} from '../../../../shared/contracts/library';
import {
  isInfographicLayoutId,
  type InfographicLayoutId,
} from '../../../../shared/infographic-layouts';
import type { AiChoice } from '../../../../shared/contracts/ai';
import { AIService } from '../../ai/ai.service';
import { buildInfographicPrompt } from '../../ai/prompts/infographic.prompt';
import { PromptService } from '../../ai/prompts/prompt.service';
import { INVALID_ANSWER_RETRY_HINT, MAX_ANSWER_ATTEMPTS } from '../../ai/prompts/retry-hint';
import { DefaultAiService } from '../../ai/default-ai.service';

import { DocumentTypeOptions } from '../domain/library.types';
import {
  InvalidInfographicError,
  parseInfographic,
  type ParsedInfographic,
  type StoredInfographic,
} from '../domain/infographic';
import { hashContent } from '../domain/mind-map';
import { InfographicStore } from '../infrastructure/infographic-store';

import { LibraryService } from './library.service';

/** Texto enviado à IA; resumos maiores que isso (raros) são cortados no fim. */
const MAX_CONTENT_CHARS = 150_000;

/**
 * Infográfico de um resumo, gerado pela IA como orquestradora (escolhe o modelo, escreve os textos
 * e escolhe as peças do banco) e guardado em disco. A IA só roda quando o usuário pede, e o
 * resultado volta a abrir depois sem gastar de novo.
 */
@Injectable()
export class InfographicService {
  /** Gerações em andamento por página: pedir de novo no meio do caminho espera a mesma resposta. */
  private readonly inFlight = new Map<string, Promise<LibraryInfographic>>();

  private readonly logger = new Logger(InfographicService.name);

  constructor(
    private readonly library: LibraryService,
    private readonly ai: AIService,
    private readonly store: InfographicStore,
    private readonly defaultAi: DefaultAiService,
    // Sem ele (testes), vale sempre o prompt padrão.
    @Optional() private readonly prompts?: PromptService,
  ) {}

  /** O infográfico guardado da página, ou `null` se ainda não foi gerado. */
  async get(id: string): Promise<LibraryInfographic | null> {
    const { content } = await this.library.get(id);
    const stored = this.store.get(id);

    // Guardado antes das seções (um modelo só): não conta a história, então é como se não existisse.
    if (!stored || !Array.isArray(stored.sections)) {
      return null;
    }

    return toView(stored, hashContent(content));
  }

  /**
   * Apaga **só o infográfico** da página. O resumo e o mapa mental ficam como estão. Página
   * inexistente é `NOT_FOUND`; página sem infográfico não é erro (já está como se pede).
   */
  async delete(id: string): Promise<void> {
    await this.library.get(id);
    this.store.delete(id);
  }

  /**
   * Guarda o infográfico como o usuário o editou (hoje: peças trocadas). Passa pela mesma limpeza da
   * resposta da IA (textos cortados nos limites, modelos e peças conferidos, peça vazia preenchida) e
   * fica marcado como editado, para gerar de novo não apagar as edições sem perguntar. Não fica
   * desatualizado: o usuário o conferiu com o texto de agora. Só para resumos.
   */
  async save(id: string, input: LibraryInfographicInput): Promise<LibraryInfographic> {
    const { meta, content } = await this.library.get(id);

    if (meta.type !== DocumentTypeOptions.SUMMARY) {
      throw new BadRequestException('O infográfico só existe para resumos.');
    }

    const sections: unknown = input?.sections;
    const only: unknown =
      Array.isArray(sections) && sections.length === 1 ? (sections[0] as unknown) : null;
    const layout: unknown = (only as { layout?: unknown } | null)?.layout;
    let parsed;

    try {
      parsed = parseInfographic(
        JSON.stringify(input),
        isInfographicLayoutId(layout) ? layout : undefined,
      );
    } catch (error) {
      if (error instanceof InvalidInfographicError) {
        throw new BadRequestException(
          'O infográfico editado precisa de título e de seções válidas.',
        );
      }

      throw error;
    }

    const previous = this.store.get(id);
    const stored: StoredInfographic = {
      contentHash: hashContent(content),
      model: previous?.model ?? 'manual',
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      edited: true,
      ...parsed,
    };

    this.store.set(id, stored);

    return toView(stored, stored.contentHash);
  }

  /** Gera (ou gera de novo) o infográfico da página e o guarda. */
  generate(
    id: string,
    options: { modelId?: string; layout?: InfographicLayoutId } = {},
  ): Promise<LibraryInfographic> {
    const running = this.inFlight.get(id);

    if (running) {
      return running;
    }

    const promise = this.run(id, options).finally(() => this.inFlight.delete(id));

    this.inFlight.set(id, promise);

    return promise;
  }

  private async run(
    id: string,
    options: { modelId?: string; layout?: InfographicLayoutId },
  ): Promise<LibraryInfographic> {
    const { meta, content } = await this.library.get(id);

    if (meta.type !== DocumentTypeOptions.SUMMARY) {
      throw new BadRequestException('O infográfico só existe para resumos.');
    }

    const choice = this.defaultAi.resolve({ modelId: options.modelId });

    const prompt = buildInfographicPrompt(
      {
        title: meta.title,
        content: content.slice(0, MAX_CONTENT_CHARS),
        layout: options.layout,
      },
      this.prompts?.instructionsFor('infographic'),
    );
    const parsed = await this.askUntilReadable(prompt, choice, options.layout, meta.title);

    const stored: StoredInfographic = {
      contentHash: hashContent(content),
      model: choice.modelId,
      createdAt: new Date().toISOString(),
      ...parsed,
    };

    this.store.set(id, stored);

    return toView(stored, stored.contentHash);
  }

  /**
   * Pede o infográfico à IA e o lê. Se a resposta vier inválida (a IA erra o formato de vez em
   * quando), pede de novo, lembrando o formato, até `MAX_ANSWER_ATTEMPTS` vezes; falha do provedor
   * (limite, chave, rede) não repete aqui: ele já tem as suas tentativas.
   */
  private async askUntilReadable(
    prompt: string,
    choice: AiChoice,
    layout: InfographicLayoutId | undefined,
    pageTitle: string,
  ): Promise<ParsedInfographic> {
    for (let attempt = 1; ; attempt += 1) {
      let answer: string;

      try {
        answer = await this.ai.chat({
          message: attempt === 1 ? prompt : `${prompt}\n\n${INVALID_ANSWER_RETRY_HINT}`,
          modelId: choice.modelId,
          providerId: choice.providerId,
          json: true,
        });
      } catch (error) {
        throw new BadGatewayException(failureMessage(error), { cause: error });
      }

      try {
        return parseInfographic(answer, layout, pageTitle);
      } catch (error) {
        if (!(error instanceof InvalidInfographicError)) {
          throw error;
        }

        // O motivo e o começo e o fim da resposta ficam no log: sem eles não dá para saber o que a IA devolveu.
        this.logger.warn(
          `Infográfico recusado (tentativa ${attempt} de ${MAX_ANSWER_ATTEMPTS}): ${error.problems.join('; ') || error.message} | resposta com ${answer.length} caracteres: ${describeAnswer(answer)}`,
        );

        if (attempt >= MAX_ANSWER_ATTEMPTS) {
          throw new BadGatewayException(
            `A IA não retornou um infográfico válido${error.problems.length ? ` (${error.problems[0]})` : ''}. Tente novamente.`,
          );
        }
      }
    }
  }
}

function toView(stored: StoredInfographic, currentHash: string): LibraryInfographic {
  const { contentHash, ...rest } = stored;

  return { ...rest, stale: contentHash !== currentHash };
}

/** O motivo da falha do provedor já vem em português (limite, chave, conexão…); o resto é genérico. */
function failureMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'Não foi possível gerar o infográfico com a IA. Tente novamente.';
}

/** O começo e o fim da resposta da IA, em uma linha, para o log (o meio de uma resposta longa não ajuda). */
export function describeAnswer(answer: string): string {
  const flat = answer.replace(/\s+/g, ' ').trim();

  return flat.length <= 700 ? flat : `${flat.slice(0, 450)} [...] ${flat.slice(-250)}`;
}
