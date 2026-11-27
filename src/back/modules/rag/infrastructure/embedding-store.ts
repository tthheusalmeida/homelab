import * as fs from 'node:fs';
import * as path from 'node:path';

import { fromBase64, toBase64 } from '../domain/vectors';

interface StoredVectors {
  model: string;
  vectors: Record<string, string>;
}

/**
 * Vetores dos trechos, guardados pelo **conteúdo** do texto (hash): editar uma página só refaz os
 * trechos que mudaram, e abrir o app de novo não refaz nada. É um cache: se o arquivo some ou é de
 * outro modelo, os vetores são refeitos. Fica fora da pasta de backup.
 */
export class EmbeddingStore {
  private readonly vectors = new Map<string, Float32Array>();
  private dirty = false;

  constructor(
    private readonly file: string | null,
    private readonly model: string,
  ) {
    this.load();
  }

  get size(): number {
    return this.vectors.size;
  }

  get(key: string): Float32Array | undefined {
    return this.vectors.get(key);
  }

  set(key: string, vector: Float32Array): void {
    this.vectors.set(key, vector);
    this.dirty = true;
  }

  /** Esquece os vetores de trechos que não existem mais. */
  retain(keys: ReadonlySet<string>): void {
    for (const key of [...this.vectors.keys()]) {
      if (!keys.has(key)) {
        this.vectors.delete(key);
        this.dirty = true;
      }
    }
  }

  /** Grava no disco se algo mudou. Falha de disco não derruba a busca: o cache só será refeito. */
  async save(): Promise<void> {
    if (!this.file || !this.dirty) {
      return;
    }

    this.dirty = false;

    const data: StoredVectors = {
      model: this.model,
      vectors: Object.fromEntries([...this.vectors].map(([key, value]) => [key, toBase64(value)])),
    };
    const temporary = `${this.file}.tmp`;

    try {
      await fs.promises.mkdir(path.dirname(this.file), { recursive: true });
      await fs.promises.writeFile(temporary, JSON.stringify(data));
      await fs.promises.rename(temporary, this.file);
    } catch {
      this.dirty = true;
    }
  }

  private load(): void {
    if (!this.file || !fs.existsSync(this.file)) {
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<StoredVectors>;

      if (data.model !== this.model || typeof data.vectors !== 'object' || data.vectors === null) {
        return;
      }

      for (const [key, value] of Object.entries(data.vectors)) {
        this.vectors.set(key, fromBase64(value));
      }
    } catch {
      // cache ilegível: começa vazio
    }
  }
}
