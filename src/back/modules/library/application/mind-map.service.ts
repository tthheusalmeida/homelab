import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';

import type { LibraryMindMap, LibraryMindMapNode } from '../../../../shared/contracts/library';
import { AIService } from '../../ai/ai.service';
import { buildMindMapPrompt } from '../../ai/prompts/mind-map.prompt';
import { cheapestModel } from '../../ai/providers/gemini/gemini.pricing';

import {
  hashContent,
  InvalidMindMapError,
  parseEditedMindMap,
  parseMindMap,
  type StoredMindMap,
} from '../domain/mind-map';
import { DocumentTypeOptions } from '../domain/library.types';
import { MindMapStore } from '../infrastructure/mind-map-store';

import { LibraryService } from './library.service';

/** Texto enviado à IA; resumos maiores que isso (raros) são cortados no fim. */
const MAX_CONTENT_CHARS = 150_000;

/**
 * Mapa mental de revisão de um resumo, gerado pela IA com um prompt próprio (o do resumo é para
 * resumir) e guardado em disco: a IA roda uma vez por resumo, até a pessoa pedir de novo.
 */
@Injectable()
export class MindMapService {
  /** Gerações em andamento por página: pedir de novo no meio do caminho espera a mesma resposta. */
  private readonly inFlight = new Map<string, Promise<LibraryMindMap>>();

  constructor(
    private readonly library: LibraryService,
    private readonly ai: AIService,
    private readonly store: MindMapStore,
  ) {}

  /** O mapa guardado da página, ou `null` se ainda não foi gerado. */
  async get(id: string): Promise<LibraryMindMap | null> {
    const { content } = await this.library.get(id);
    const stored = this.store.get(id);

    return stored ? toView(stored, hashContent(content)) : null;
  }

  /**
   * Apaga **só o mapa mental** da página (com as edições do usuário). O resumo e o infográfico ficam
   * como estão. Página inexistente é `NOT_FOUND`; página sem mapa não é erro (já está como se pede).
   */
  async delete(id: string): Promise<void> {
    await this.library.get(id);
    this.store.delete(id);
  }

  /** Gera (ou gera de novo) o mapa da página e o guarda. */
  generate(id: string, modelId?: string): Promise<LibraryMindMap> {
    const running = this.inFlight.get(id);

    if (running) {
      return running;
    }

    const promise = this.run(id, modelId).finally(() => this.inFlight.delete(id));

    this.inFlight.set(id, promise);

    return promise;
  }

  /**
   * Guarda o mapa **como o usuário o editou** (termos, frases, subtítulo, nós a mais ou a menos).
   * O texto vira o do usuário (limites de edição), o mapa fica marcado como editado e deixa de
   * estar desatualizado (o usuário o conferiu com o texto de agora). Só para resumos, e o mapa
   * precisa ter pelo menos um ramo com texto.
   */
  async save(
    id: string,
    input: { subtitle?: string; nodes: LibraryMindMapNode[] },
  ): Promise<LibraryMindMap> {
    const { meta, content } = await this.library.get(id);

    if (meta.type !== DocumentTypeOptions.SUMMARY) {
      throw new BadRequestException('O mapa mental só existe para resumos.');
    }

    let parsed;

    try {
      parsed = parseEditedMindMap(input);
    } catch (error) {
      if (error instanceof InvalidMindMapError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }

    const previous = this.store.get(id);
    const stored: StoredMindMap = {
      contentHash: hashContent(content),
      // Mapa feito do zero (sem IA antes) fica como "manual".
      model: previous?.model ?? 'manual',
      createdAt: previous?.createdAt ?? new Date().toISOString(),
      edited: true,
      ...parsed,
    };

    this.store.set(id, stored);

    return toView(stored, stored.contentHash);
  }

  private async run(id: string, modelId?: string): Promise<LibraryMindMap> {
    const { meta, content } = await this.library.get(id);

    if (meta.type !== DocumentTypeOptions.SUMMARY) {
      throw new BadRequestException('O mapa mental só existe para resumos.');
    }

    const model = modelId?.trim() || cheapestModel();

    let answer: string;

    try {
      answer = await this.ai.chat({
        message: buildMindMapPrompt({
          title: meta.title,
          content: content.slice(0, MAX_CONTENT_CHARS),
        }),
        modelId: model,
        providerId: 'gemini',
      });
    } catch (error) {
      throw new BadGatewayException(failureMessage(error), { cause: error });
    }

    let parsed;

    try {
      parsed = parseMindMap(answer);
    } catch (error) {
      if (error instanceof InvalidMindMapError) {
        throw new BadGatewayException('A IA não retornou um mapa mental válido. Tente novamente.');
      }

      throw error;
    }

    const stored: StoredMindMap = {
      contentHash: hashContent(content),
      model,
      createdAt: new Date().toISOString(),
      ...parsed,
    };

    this.store.set(id, stored);

    return toView(stored, stored.contentHash);
  }
}

function toView(stored: StoredMindMap, currentHash: string): LibraryMindMap {
  return {
    ...(stored.subtitle ? { subtitle: stored.subtitle } : {}),
    nodes: stored.nodes,
    model: stored.model,
    createdAt: stored.createdAt,
    stale: stored.contentHash !== currentHash,
    edited: stored.edited === true,
  };
}

/** O motivo da falha do provedor já vem em português (limite, chave, conexão…); o resto é genérico. */
function failureMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() !== ''
    ? error.message
    : 'Não foi possível gerar o mapa mental com a IA. Tente novamente.';
}
