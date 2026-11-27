import { Inject, Injectable, Optional } from '@nestjs/common';

import * as crypto from 'node:crypto';
import * as fs from 'node:fs';

import {
  EMBEDDING_MODEL,
  EMBEDDING_QUERY_PREFIX,
  embeddingDocumentText,
} from '../../../../shared/embedding-model';
import { DocumentStatusOptions } from '../../library/domain/library.types';
import { LibraryIndex, type IndexedDocument } from '../../library/infrastructure/library-index';
import { LibraryStorage } from '../../library/infrastructure/library-storage';
import { Bm25Index } from '../domain/bm25-index';
import { chunkMarkdown, type Chunk } from '../domain/chunker';
import { buildQuery } from '../domain/query-builder';
import type { RagHit, RagSearchResult } from '../domain/rag.types';
import { analyze } from '../domain/text-analysis';
import { fuseRankings, similarity } from '../domain/vectors';
import { EmbeddingStore } from '../infrastructure/embedding-store';

import { EMBEDDER, type Embedder } from './embedder';
export const EMBEDDING_STORE = Symbol('EMBEDDING_STORE');

/** Trechos mais próximos em sentido da pergunta, e a semelhança de cada trecho que tem vetor. */
interface SemanticMatch {
  ranking: string[];
  similarity: Map<string, number>;
}

export const DEFAULT_HIT_LIMIT = 8;
/** Mais de um trecho da mesma página só entra se a página tiver mais de um bom trecho. */
const MAX_HITS_PER_DOCUMENT = 3;
/** Candidatos buscados além do pedido, para sobrar depois de limitar por página. */
const CANDIDATE_FACTOR = 4;
/** Intervalo mínimo entre duas conferências de arquivos alterados. */
const SYNC_INTERVAL_MS = 1500;
/** Trechos por rodada de vetores: a busca já enxerga o que ficou pronto a cada rodada. */
const EMBED_BATCH = 32;

interface IndexedPage {
  /** Quando o arquivo foi alterado e o tamanho: muda → a página é lida e cortada de novo. */
  fingerprint: string;
  title: string;
  category: string[];
  chunks: Chunk[];
}

/**
 * Busca nos trechos das páginas publicadas. O índice vive em memória e é montado das próprias
 * páginas (que continuam sendo a fonte da verdade): antes de buscar, o serviço confere quais
 * arquivos mudaram, apareceram ou sumiram e atualiza só esses. Por isso editar uma página, no app
 * ou fora dele, nunca deixa a busca velha, e nenhum outro código precisa avisá-lo.
 */
@Injectable()
export class RagSearchService {
  private readonly pages = new Map<string, IndexedPage>();
  private bm25 = new Bm25Index();
  private vocabulary: ReadonlyMap<string, number> = new Map();
  private lastSync = 0;
  private syncing: Promise<void> | null = null;

  /** Chave do vetor de cada trecho (hash do texto) e o texto que o modelo de vetores recebe. */
  private readonly keys = new Map<string, string>();
  private embedding: Promise<void> | null = null;
  /** Textos que ainda não têm vetor, por chave. */
  private readonly pending = new Map<string, string>();

  constructor(
    private readonly library: LibraryIndex,
    private readonly storage: LibraryStorage,
    /** Quem faz os vetores (busca por sentido). Sem ele, a busca é só por palavras. */
    @Optional() @Inject(EMBEDDER) private readonly embedder?: Embedder,
    @Optional() @Inject(EMBEDDING_STORE) private readonly store?: EmbeddingStore,
  ) {}

  async search(query: string, limit = DEFAULT_HIT_LIMIT): Promise<RagSearchResult> {
    const started = performance.now();

    await this.sync();
    this.startEmbedding();

    const semantic = await this.semanticRanking(query, limit * CANDIDATE_FACTOR);
    const hits = this.hitsFor(query, limit, semantic);

    return {
      hits,
      documents: this.pages.size,
      chunks: this.bm25.size,
      elapsedMs: Math.round(performance.now() - started),
      semantic: semantic !== null,
    };
  }

  /** Espera os vetores pendentes ficarem prontos (para testes e para medir). */
  whenEmbedded(): Promise<void> {
    return this.embedding ?? Promise.resolve();
  }

  /** Faz a próxima busca conferir os arquivos de novo, sem esperar o intervalo. */
  invalidate(): void {
    this.lastSync = 0;
  }

  /**
   * Trechos mais próximos **em sentido** da pergunta, do mais para o menos parecido; `null` quando a
   * busca por sentido não está disponível (sem modelo de vetores, ou nenhum vetor pronto ainda).
   */
  private async semanticRanking(query: string, limit: number): Promise<SemanticMatch | null> {
    if (!this.embedder || !this.store || this.store.size === 0) {
      return null;
    }

    const [vector] = (await this.embedder.embed([EMBEDDING_QUERY_PREFIX + query])) ?? [];

    if (!vector) {
      return null;
    }

    const scored: Array<[string, number]> = [];

    for (const [chunkId, key] of this.keys) {
      const stored = this.store.get(key);

      if (stored) {
        scored.push([chunkId, similarity(vector, stored)]);
      }
    }

    scored.sort((a, b) => b[1] - a[1]);

    return {
      ranking: scored.slice(0, limit).map(([id]) => id),
      similarity: new Map(scored),
    };
  }

  private hitsFor(query: string, limit: number, semantic: SemanticMatch | null): RagHit[] {
    const terms = buildQuery(query, this.vocabulary);
    const lexical = this.bm25.search(terms, limit * CANDIDATE_FACTOR);
    const coverage = new Map(lexical.map((match) => [match.id, match.matchedTerms / terms.length]));
    const scores = new Map(lexical.map((match) => [match.id, match.score]));
    // Com busca por sentido, a ordem final junta as duas listas; sem ela, vale só a de palavras.
    const order = semantic
      ? [
          ...fuseRankings(
            lexical.map((match) => match.id),
            semantic.ranking,
          ),
        ]
          .sort((a, b) => b[1] - a[1])
          .map(([id, score]) => ({ id, score }))
      : lexical.map((match) => ({ id: match.id, score: match.score }));
    const perDocument = new Map<string, number>();
    const hits: RagHit[] = [];

    for (const { id, score } of order) {
      if (hits.length >= limit) {
        break;
      }

      const hit = this.toHit(
        id,
        semantic ? score : (scores.get(id) ?? score),
        coverage.get(id) ?? 0,
      );
      const taken = perDocument.get(hit.documentId) ?? 0;

      if (taken >= MAX_HITS_PER_DOCUMENT) {
        continue;
      }

      perDocument.set(hit.documentId, taken + 1);
      hits.push(semantic ? { ...hit, similarity: semantic.similarity.get(id) } : hit);
    }

    return hits;
  }

  private toHit(chunkId: string, score: number, coverage: number): RagHit {
    const separator = chunkId.lastIndexOf('#');
    const documentId = chunkId.slice(0, separator);
    const page = this.pages.get(documentId);
    const chunk = page?.chunks[Number(chunkId.slice(separator + 1))];

    if (!page || !chunk) {
      throw new Error(`Trecho fora do índice: ${chunkId}`);
    }

    return {
      chunkId,
      documentId,
      title: page.title,
      category: page.category,
      headingPath: chunk.headingPath,
      anchor: chunk.anchor,
      line: chunk.line,
      text: chunk.text,
      score,
      coverage,
    };
  }

  /** Atualiza o índice se algo mudou; chamadas juntas aproveitam a mesma conferência. */
  private sync(): Promise<void> {
    if (this.syncing) {
      return this.syncing;
    }

    if (Date.now() - this.lastSync < SYNC_INTERVAL_MS) {
      return Promise.resolve();
    }

    this.syncing = this.refresh().finally(() => {
      this.lastSync = Date.now();
      this.syncing = null;
    });

    return this.syncing;
  }

  private async refresh(): Promise<void> {
    const published = this.library
      .all()
      .filter((doc) => doc.meta.status === DocumentStatusOptions.PUBLISHED);
    const stamps = await Promise.all(published.map((doc) => this.stampOf(doc)));
    let changed = false;

    for (const id of [...this.pages.keys()]) {
      if (!published.some((doc) => doc.meta.id === id)) {
        this.pages.delete(id);
        changed = true;
      }
    }

    for (const [index, doc] of published.entries()) {
      const fingerprint = stamps[index];

      if (fingerprint !== null && this.pages.get(doc.meta.id)?.fingerprint !== fingerprint) {
        changed = (await this.load(doc, fingerprint)) || changed;
      }
    }

    if (changed || this.bm25.size === 0) {
      this.rebuild();
    }
  }

  private async stampOf(doc: IndexedDocument): Promise<string | null> {
    try {
      const { mtimeMs, size } = await fs.promises.stat(doc.path);

      return `${mtimeMs}:${size}`;
    } catch {
      return null;
    }
  }

  private async load(doc: IndexedDocument, fingerprint: string): Promise<boolean> {
    try {
      const stored = await this.storage.read(doc.path);

      this.pages.set(doc.meta.id, {
        fingerprint,
        title: stored.meta.title,
        category: stored.meta.category,
        chunks: chunkMarkdown(stored.body),
      });

      return true;
    } catch {
      // arquivo ilegível: a página fica fora da busca até ser corrigida
      return this.pages.delete(doc.meta.id);
    }
  }

  /** Monta o índice de palavras a partir dos trechos guardados (é rápido: só contas em memória). */
  private rebuild(): void {
    const bm25 = new Bm25Index();

    for (const [id, page] of this.pages) {
      const title = analyze(page.title);

      for (const chunk of page.chunks) {
        bm25.add(`${id}#${chunk.ordinal}`, {
          title,
          headings: analyze(chunk.headingPath.join(' ')),
          body: analyze(chunk.text),
        });
      }
    }

    this.bm25 = bm25;
    this.vocabulary = bm25.vocabulary();
    this.indexVectorKeys();
  }

  /** Dá a cada trecho a chave do seu vetor (hash do texto) e pede os que ainda faltam. */
  private indexVectorKeys(): void {
    this.keys.clear();
    this.pending.clear();

    for (const [id, page] of this.pages) {
      for (const chunk of page.chunks) {
        const text = embeddingDocumentText(
          [page.title, ...chunk.headingPath.filter((name) => name !== page.title)].join(' › '),
          chunk.text,
        );
        const key = crypto.createHash('sha1').update(EMBEDDING_MODEL).update(text).digest('hex');

        this.keys.set(`${id}#${chunk.ordinal}`, key);

        if (!this.store?.get(key)) {
          this.pending.set(key, text);
        }
      }
    }

    this.store?.retain(new Set(this.keys.values()));
  }

  /** Começa a fazer os vetores que faltam, se ainda não está fazendo. */
  private startEmbedding(): void {
    if (this.embedding || this.pending.size === 0 || !this.embedder || !this.store) {
      return;
    }

    this.embedding = this.embedPending().finally(() => {
      this.embedding = null;
    });
  }

  /**
   * Faz os vetores dos trechos novos, em segundo plano e aos poucos: enquanto isso a busca já usa
   * os que existem. Se o modelo de vetores não responde, para (e tenta de novo na próxima mudança).
   */
  private async embedPending(): Promise<void> {
    const { embedder, store } = this;

    if (!embedder || !store) {
      return;
    }

    while (this.pending.size > 0) {
      const batch = [...this.pending].slice(0, EMBED_BATCH);
      const vectors = await embedder.embed(batch.map(([, text]) => text));

      if (!vectors) {
        break;
      }

      batch.forEach(([key], index) => {
        store.set(key, vectors[index]);
        this.pending.delete(key);
      });
    }

    await store.save();
  }
}
