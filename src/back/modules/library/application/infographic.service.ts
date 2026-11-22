import { BadGatewayException, BadRequestException, Injectable, Optional } from '@nestjs/common';

import type {
  LibraryInfographic,
  LibraryInfographicInput,
} from '../../../../shared/contracts/library';
import {
  isInfographicLayoutId,
  type InfographicLayoutId,
} from '../../../../shared/infographic-layouts';
import { AIService } from '../../ai/ai.service';
import { buildInfographicPrompt } from '../../ai/prompts/infographic.prompt';
import { PromptService } from '../../ai/prompts/prompt.service';
import { cheapestModel } from '../../ai/providers/gemini/gemini.pricing';

import { DocumentTypeOptions } from '../domain/library.types';
import {
  InvalidInfographicError,
  parseInfographic,
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

  constructor(
    private readonly library: LibraryService,
    private readonly ai: AIService,
    private readonly store: InfographicStore,
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

    const model = options.modelId?.trim() || cheapestModel();

    let answer: string;

    try {
      answer = await this.ai.chat({
        message: buildInfographicPrompt(
          {
            title: meta.title,
            content: content.slice(0, MAX_CONTENT_CHARS),
            layout: options.layout,
          },
          this.prompts?.instructionsFor('infographic'),
        ),
        modelId: model,
        providerId: 'gemini',
      });
    } catch (error) {
      throw new BadGatewayException(failureMessage(error), { cause: error });
    }

    let parsed;

    try {
      parsed = parseInfographic(answer, options.layout);
    } catch (error) {
      if (error instanceof InvalidInfographicError) {
        throw new BadGatewayException('A IA não retornou um infográfico válido. Tente novamente.');
      }

      throw error;
    }

    const stored: StoredInfographic = {
      contentHash: hashContent(content),
      model,
      createdAt: new Date().toISOString(),
      ...parsed,
    };

    this.store.set(id, stored);

    return toView(stored, stored.contentHash);
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
