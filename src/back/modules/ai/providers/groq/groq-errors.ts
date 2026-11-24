import { classifyByStatus, statusOf, type ErrorInfo } from '../shared/status-error-classifier';

/** Quantas vezes o app tenta falar com a Groq antes de desistir (contando a primeira). */
export const GROQ_MAX_ATTEMPTS = 3;

/** Espera antes da 2ª e da 3ª tentativa. */
export const GROQ_RETRY_DELAYS_MS = [3000, 8000];

export const GroqErrorMessages = {
  rateLimit: 'O limite de uso da Groq foi atingido. Aguarde um pouco ou escolha outro modelo.',
  overloaded: 'A Groq está sobrecarregada ou indisponível no momento.',
  network: 'Não foi possível conectar à Groq. Verifique a conexão com a internet.',
  emptyResponse: 'A Groq devolveu uma resposta vazia.',
  auth: 'A Groq recusou a chave. Confira a chave em Configurações.',
  modelNotFound: 'O modelo escolhido não está disponível na Groq. Escolha outro modelo.',
  badRequest: 'A Groq não aceitou o pedido (texto grande demais ou conteúdo recusado).',
  /** Pedido recusado com o motivo que a própria Groq informou. */
  badRequestWith: (detail: string) => `A Groq não aceitou o pedido: ${detail}`,
  unknown: 'A requisição para o chat da Groq falhou.',
} as const;

/** A Groq respondeu, mas sem texto (costuma passar numa nova tentativa). */
export class GroqEmptyResponseError extends Error {
  constructor() {
    super('A resposta da Groq não contém texto.');
    this.name = 'GroqEmptyResponseError';
  }
}

/** Motivo que a API da Groq escreveu no corpo do erro (`{ error: { message } }`), se houver. */
function detailOf(error: unknown): string | undefined {
  const body = (error as { error?: { error?: { message?: unknown }; message?: unknown } } | null)
    ?.error;
  const message = body?.error?.message ?? body?.message;

  return typeof message === 'string' && message.trim() ? message.trim() : undefined;
}

/** Diz se o erro da Groq é passageiro e qual mensagem mostrar. */
export function classifyGroqError(error: unknown): ErrorInfo {
  if (error instanceof GroqEmptyResponseError) {
    return { retryable: true, message: GroqErrorMessages.emptyResponse };
  }

  const status = statusOf(error);

  if (status === 400 || status === 413) {
    const detail = detailOf(error);

    if (detail) {
      return { retryable: false, message: GroqErrorMessages.badRequestWith(detail) };
    }
  }

  return classifyByStatus(error, GroqErrorMessages);
}
