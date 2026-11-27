import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

import { EMBEDDING_MODEL } from '../../../../shared/embedding-model';
import { BackConfig } from '../../../config/back-config';
import { prepareOllama } from '../../ai/providers/ollama/ollama-endpoint';
import type { Embedder } from '../application/embedder';
import { normalize } from '../domain/vectors';

/** Depois de uma falha, quanto tempo sem tentar de novo (modelo não instalado, servidor desligado). */
export const RETRY_AFTER_FAILURE_MS = 60_000;
/** Textos por pedido: lote grande estoura a memória do modelo. */
const BATCH_SIZE = 16;

/** Vetores pelo `/api/embed` do Ollama (o mesmo servidor do chat), com o modelo de `EMBEDDING_MODEL`. */
@Injectable()
export class OllamaEmbedder implements Embedder {
  private failedAt = 0;
  /** Relógio (trocável nos testes). Fora do construtor para o Nest não o tratar como dependência. */
  now: () => number = Date.now;

  constructor(
    private readonly http: HttpService,
    private readonly config: BackConfig,
  ) {}

  async embed(texts: string[]): Promise<Float32Array[] | null> {
    if (texts.length === 0) {
      return [];
    }

    if (this.failedAt > 0 && this.now() - this.failedAt < RETRY_AFTER_FAILURE_MS) {
      return null;
    }

    try {
      await prepareOllama(this.config);

      const vectors: Float32Array[] = [];

      for (let start = 0; start < texts.length; start += BATCH_SIZE) {
        const input = texts.slice(start, start + BATCH_SIZE);
        const response = await firstValueFrom(
          this.http.post<{ embeddings?: number[][] }>(`${this.config.ollamaUrl}/api/embed`, {
            model: EMBEDDING_MODEL,
            input,
            truncate: true,
          }),
        );
        const batch = response.data?.embeddings;

        if (!Array.isArray(batch) || batch.length !== input.length) {
          throw new Error('Resposta de vetores inválida.');
        }

        vectors.push(...batch.map(normalize));
      }

      this.failedAt = 0;

      return vectors;
    } catch {
      this.failedAt = this.now();

      return null;
    }
  }
}
