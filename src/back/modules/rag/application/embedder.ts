/**
 * Quem transforma textos em vetores (porta: a busca não sabe como). `null` = não deu agora (modelo
 * não instalado, servidor desligado): a busca segue só por palavras.
 */
export interface Embedder {
  /** Vetores na mesma ordem dos textos. */
  embed(texts: string[]): Promise<Float32Array[] | null>;
}

export const EMBEDDER = Symbol('EMBEDDER');
