/** Quantas vezes o app tenta falar com o Gemini antes de desistir (contando a primeira). */
export const GEMINI_MAX_ATTEMPTS = 3;

/** Espera antes da 2ª e da 3ª tentativa. */
export const GEMINI_RETRY_DELAYS_MS = [3000, 8000];

export const GeminiErrorMessages = {
  rateLimit: 'O limite de uso do Gemini foi atingido. Aguarde um pouco ou escolha outro modelo.',
  overloaded: 'O Gemini está sobrecarregado ou indisponível no momento.',
  network: 'Não foi possível conectar ao Gemini. Verifique a conexão com a internet.',
  emptyResponse: 'O Gemini devolveu uma resposta vazia.',
  auth: 'O Gemini recusou a chave. Confira a chave em Configurações.',
  modelNotFound: 'O modelo escolhido não está disponível no Gemini. Escolha outro modelo.',
  badRequest: 'O Gemini não aceitou o pedido (texto grande demais ou conteúdo recusado).',
  unknown: 'A requisição para o chat do Gemini falhou.',
} as const;

/** O Gemini respondeu, mas sem texto (costuma passar numa nova tentativa). */
export class GeminiEmptyResponseError extends Error {
  constructor() {
    super('A resposta do Gemini não contém texto.');
    this.name = 'GeminiEmptyResponseError';
  }
}

export interface GeminiErrorInfo {
  /** Vale tentar de novo: o erro costuma ser passageiro. */
  retryable: boolean;
  /** Motivo em português para mostrar ao usuário. */
  message: string;
}

const NETWORK_PATTERN =
  /fetch failed|network|ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket|timed? ?out/i;

function statusOf(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;

  return typeof status === 'number' ? status : undefined;
}

function textOf(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const cause = error.cause instanceof Error ? ` ${error.cause.message}` : '';

  return `${error.message}${cause}`;
}

/** Diz se o erro do Gemini é passageiro e qual mensagem mostrar. */
export function classifyGeminiError(error: unknown): GeminiErrorInfo {
  if (error instanceof GeminiEmptyResponseError) {
    return { retryable: true, message: GeminiErrorMessages.emptyResponse };
  }

  const status = statusOf(error);

  if (status === 429) {
    return { retryable: true, message: GeminiErrorMessages.rateLimit };
  }

  if (status !== undefined && status >= 500) {
    return { retryable: true, message: GeminiErrorMessages.overloaded };
  }

  if (status === 401 || status === 403) {
    return { retryable: false, message: GeminiErrorMessages.auth };
  }

  if (status === 404) {
    return { retryable: false, message: GeminiErrorMessages.modelNotFound };
  }

  if (status === 400) {
    return { retryable: false, message: GeminiErrorMessages.badRequest };
  }

  if (status === undefined && NETWORK_PATTERN.test(textOf(error))) {
    return { retryable: true, message: GeminiErrorMessages.network };
  }

  return { retryable: false, message: GeminiErrorMessages.unknown };
}
