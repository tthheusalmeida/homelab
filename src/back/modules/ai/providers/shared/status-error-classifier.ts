export interface ErrorInfo {
  /** Vale tentar de novo: o erro costuma ser passageiro. */
  retryable: boolean;
  /** Motivo em português para mostrar ao usuário. */
  message: string;
}

/** As mensagens que cada provider dá aos erros HTTP comuns (cada um cita o próprio nome). */
export interface StatusMessages {
  rateLimit: string;
  overloaded: string;
  network: string;
  auth: string;
  modelNotFound: string;
  badRequest: string;
  unknown: string;
}

const NETWORK_PATTERN =
  /fetch failed|network|connection|ECONN|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|socket|timed? ?out/i;

/** Status HTTP do erro da SDK, se houver. */
export function statusOf(error: unknown): number | undefined {
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

/**
 * Classifica um erro de API pelo status HTTP: limite de uso e erro de servidor passam sozinhos;
 * chave, modelo e pedido recusados não; sem status, falha de rede passa. Cada provider acrescenta o
 * que é só dele (resposta vazia, recusa de conteúdo, motivos do corpo do erro) antes de chamar isto.
 */
export function classifyByStatus(error: unknown, messages: StatusMessages): ErrorInfo {
  const status = statusOf(error);

  if (status === 429) {
    return { retryable: true, message: messages.rateLimit };
  }

  if (status !== undefined && status >= 500) {
    return { retryable: true, message: messages.overloaded };
  }

  if (status === 401 || status === 403) {
    return { retryable: false, message: messages.auth };
  }

  if (status === 404) {
    return { retryable: false, message: messages.modelNotFound };
  }

  if (status === 400 || status === 413) {
    return { retryable: false, message: messages.badRequest };
  }

  if (status === undefined && NETWORK_PATTERN.test(textOf(error))) {
    return { retryable: true, message: messages.network };
  }

  return { retryable: false, message: messages.unknown };
}
