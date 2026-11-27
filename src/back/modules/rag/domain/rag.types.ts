/** Um trecho de página achado pela busca, com tudo o que o chat precisa para usá-lo e citá-lo. */
export interface RagHit {
  /** Identifica o trecho: `<id da página>#<posição>`. */
  chunkId: string;
  documentId: string;
  /** Título da página. */
  title: string;
  category: string[];
  /** Títulos que levam ao trecho, do maior ao menor. */
  headingPath: string[];
  /** Âncora da seção (a mesma do visualizador); `null` se o trecho vem antes do primeiro título. */
  anchor: string | null;
  /** Linha onde o trecho começa na página. */
  line: number;
  text: string;
  /** Pontuação (só para ordenar e comparar; não tem unidade). */
  score: number;
  /** Fração (0 a 1) das palavras úteis da pergunta que o trecho contém. */
  coverage: number;
}

export interface RagSearchResult {
  hits: RagHit[];
  /** Páginas e trechos que a busca conhece agora. */
  documents: number;
  chunks: number;
  /** Quanto tempo a busca levou (milissegundos). */
  elapsedMs: number;
}
