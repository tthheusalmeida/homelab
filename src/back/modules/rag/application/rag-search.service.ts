import { Injectable } from '@nestjs/common';

import * as fs from 'node:fs';

import { DocumentStatusOptions } from '../../library/domain/library.types';
import { LibraryIndex, type IndexedDocument } from '../../library/infrastructure/library-index';
import { LibraryStorage } from '../../library/infrastructure/library-storage';
import { Bm25Index } from '../domain/bm25-index';
import { chunkMarkdown, type Chunk } from '../domain/chunker';
import { buildQuery } from '../domain/query-builder';
import type { RagHit, RagSearchResult } from '../domain/rag.types';
import { analyze } from '../domain/text-analysis';

export const DEFAULT_HIT_LIMIT = 8;
/** Mais de um trecho da mesma página só entra se a página tiver mais de um bom trecho. */
const MAX_HITS_PER_DOCUMENT = 3;
/** Candidatos buscados além do pedido, para sobrar depois de limitar por página. */
const CANDIDATE_FACTOR = 4;
/** Intervalo mínimo entre duas conferências de arquivos alterados. */
const SYNC_INTERVAL_MS = 1500;

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

  constructor(
    private readonly library: LibraryIndex,
    private readonly storage: LibraryStorage,
  ) {}

  async search(query: string, limit = DEFAULT_HIT_LIMIT): Promise<RagSearchResult> {
    const started = performance.now();

    await this.sync();

    const hits = this.hitsFor(query, limit);

    return {
      hits,
      documents: this.pages.size,
      chunks: this.bm25.size,
      elapsedMs: Math.round(performance.now() - started),
    };
  }

  /** Faz a próxima busca conferir os arquivos de novo, sem esperar o intervalo. */
  invalidate(): void {
    this.lastSync = 0;
  }

  private hitsFor(query: string, limit: number): RagHit[] {
    const terms = buildQuery(query, this.vocabulary);
    const perDocument = new Map<string, number>();
    const hits: RagHit[] = [];

    for (const match of this.bm25.search(terms, limit * CANDIDATE_FACTOR)) {
      if (hits.length >= limit) {
        break;
      }

      const hit = this.toHit(match.id, match.score, match.matchedTerms / terms.length);
      const taken = perDocument.get(hit.documentId) ?? 0;

      if (taken >= MAX_HITS_PER_DOCUMENT) {
        continue;
      }

      perDocument.set(hit.documentId, taken + 1);
      hits.push(hit);
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
  }
}
