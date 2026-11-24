import { classifyByStatus, statusOf, type ErrorInfo } from '../shared/status-error-classifier';

/** Quantas vezes o app tenta falar com a Anthropic antes de desistir (contando a primeira). */
export const ANTHROPIC_MAX_ATTEMPTS = 3;

/** Espera antes da 2ª e da 3ª tentativa. */
export const ANTHROPIC_RETRY_DELAYS_MS = [3000, 8000];

export const AnthropicErrorMessages = {
  rateLimit: 'O limite de uso da Anthropic foi atingido. Aguarde um pouco ou escolha outro modelo.',
  overloaded: 'A Anthropic está sobrecarregada ou indisponível no momento.',
  network: 'Não foi possível conectar à Anthropic. Verifique a conexão com a internet.',
  emptyResponse: 'A Anthropic devolveu uma resposta vazia.',
  refusal: 'A Anthropic recusou responder a este conteúdo.',
  auth: 'A Anthropic recusou a chave. Confira a chave em Configurações.',
  modelNotFound: 'O modelo escolhido não está disponível na Anthropic. Escolha outro modelo.',
  badRequest: 'A Anthropic não aceitou o pedido (texto grande demais ou conteúdo recusado).',
  noCredit:
    'A conta da Anthropic está sem crédito. Adicione crédito no painel da Anthropic e tente de novo.',
  /** Pedido recusado com o motivo que a própria Anthropic informou. */
  badRequestWith: (detail: string) => `A Anthropic não aceitou o pedido: ${detail}`,
  unknown: 'A requisição para o chat da Anthropic falhou.',
} as const;

/** A Anthropic respondeu, mas sem texto (costuma passar numa nova tentativa). */
export class AnthropicEmptyResponseError extends Error {
  constructor() {
    super('A resposta da Anthropic não contém texto.');
    this.name = 'AnthropicEmptyResponseError';
  }
}

/** A Anthropic recusou o conteúdo (`stop_reason: "refusal"`); repetir não adianta. */
export class AnthropicRefusalError extends Error {
  constructor() {
    super('A Anthropic recusou responder.');
    this.name = 'AnthropicRefusalError';
  }
}

export type AnthropicErrorInfo = ErrorInfo;

/** Motivo que a API da Anthropic escreveu no corpo do erro (`{ error: { message } }`), se houver. */
function detailOf(error: unknown): string | undefined {
  const body = (error as { error?: { error?: { message?: unknown }; message?: unknown } } | null)
    ?.error;
  const message = body?.error?.message ?? body?.message;

  return typeof message === 'string' && message.trim() ? message.trim() : undefined;
}

/** Diz se o erro da Anthropic é passageiro e qual mensagem mostrar (529 é "sobrecarregada"). */
export function classifyAnthropicError(error: unknown): AnthropicErrorInfo {
  if (error instanceof AnthropicEmptyResponseError) {
    return { retryable: true, message: AnthropicErrorMessages.emptyResponse };
  }

  if (error instanceof AnthropicRefusalError) {
    return { retryable: false, message: AnthropicErrorMessages.refusal };
  }

  const status = statusOf(error);

  if (status === 400 || status === 413) {
    const detail = detailOf(error);

    // a Anthropic responde 400 também quando falta crédito na conta
    if (detail && /credit balance/i.test(detail)) {
      return { retryable: false, message: AnthropicErrorMessages.noCredit };
    }

    if (detail) {
      return { retryable: false, message: AnthropicErrorMessages.badRequestWith(detail) };
    }
  }

  return classifyByStatus(error, AnthropicErrorMessages);
}
