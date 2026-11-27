/**
 * Modelo que transforma textos em vetores para a busca por sentido nas páginas (pequeno, entende
 * português e roda em qualquer computador). É um modelo do Ollama: o app o baixa em Configurações >
 * Componentes. Sem ele, a busca continua só por palavras.
 */
export const EMBEDDING_MODEL = 'embeddinggemma';

/** Tamanho aproximado do download, em bytes. */
export const EMBEDDING_MODEL_BYTES = 621_000_000;

/** Prefixos que o modelo pede: um para a pergunta e outro para o texto que se procura. */
export const EMBEDDING_QUERY_PREFIX = 'task: search result | query: ';

export function embeddingDocumentText(title: string, text: string): string {
  return `title: ${title} | text: ${text}`;
}
