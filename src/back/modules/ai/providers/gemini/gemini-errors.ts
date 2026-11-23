import { classifyByStatus, type ErrorInfo } from '../shared/status-error-classifier';

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

export type GeminiErrorInfo = ErrorInfo;

/** Diz se o erro do Gemini é passageiro e qual mensagem mostrar. */
export function classifyGeminiError(error: unknown): GeminiErrorInfo {
  if (error instanceof GeminiEmptyResponseError) {
    return { retryable: true, message: GeminiErrorMessages.emptyResponse };
  }

  return classifyByStatus(error, GeminiErrorMessages);
}
