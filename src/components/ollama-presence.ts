import * as fs from 'node:fs';

import { manifestPath } from './ollama-manifest';

/** Como se sabe que um modelo do Ollama está instalado. */
export interface ModelPresence {
  has(ref: string): boolean;
  /** Atualiza o que se sabe (consulta o servidor); a pergunta `has` é sempre instantânea. */
  refresh?(): Promise<void>;
}

/** O assistente do app: o modelo está instalado se o manifesto dele existe na pasta de modelos. */
export class ManifestPresence implements ModelPresence {
  constructor(private readonly modelsDir: string) {}

  has(ref: string): boolean {
    return fs.existsSync(manifestPath(this.modelsDir, ref));
  }
}

/** Referência com tag: `embeddinggemma` vale `embeddinggemma:latest`. */
function withTag(ref: string): string {
  return ref.includes(':') ? ref : `${ref}:latest`;
}

/** O Ollama do usuário: pergunta ao servidor (`/api/tags`) quais modelos ele tem. */
export class TagsPresence implements ModelPresence {
  private names = new Set<string>();

  constructor(private readonly list: () => Promise<string[] | null>) {}

  has(ref: string): boolean {
    return this.names.has(withTag(ref));
  }

  async refresh(): Promise<void> {
    const names = await this.list();

    // servidor desligado: não se sabe, então nada aparece como instalado
    this.names = new Set((names ?? []).map(withTag));
  }
}
