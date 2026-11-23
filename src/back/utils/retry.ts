/** Avisa que a próxima tentativa vai começar (antes da espera). */
export interface RetryInfo {
  /** Número da tentativa que vai começar (2 é a primeira repetição). */
  attempt: number;
  maxAttempts: number;
  /** Quanto se espera antes dela. */
  delayMs: number;
  /** O erro que fez repetir. */
  error: unknown;
}

export interface RetryOptions {
  /** Total de tentativas, contando a primeira. */
  maxAttempts: number;
  /** Espera antes de cada repetição (a última vale para as que sobrarem). */
  delaysMs: number[];
  /** Só erros passageiros devem repetir; os outros sobem na hora. */
  isRetryable: (error: unknown) => boolean;
  onRetry?: (info: RetryInfo) => void;
  /** Espera de verdade; trocável nos testes. */
  sleep?: (ms: number) => Promise<void>;
}

export const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Roda `run` e repete se falhar com erro passageiro, até `maxAttempts`; o último erro sobe. */
export async function withRetry<T>(run: () => Promise<T>, options: RetryOptions): Promise<T> {
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= options.maxAttempts || !options.isRetryable(error)) {
        throw error;
      }

      const delayMs = options.delaysMs[Math.min(attempt - 1, options.delaysMs.length - 1)] ?? 0;

      options.onRetry?.({ attempt: attempt + 1, maxAttempts: options.maxAttempts, delayMs, error });

      await sleep(delayMs);
    }
  }
}

/** Espera `promise`, mas termina na hora com `AbortError` se o `signal` for abortado. */
export function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const abort = () =>
      reject(Object.assign(new Error('Operação cancelada.'), { name: 'AbortError' }));

    if (signal.aborted) {
      abort();

      return;
    }

    signal.addEventListener('abort', abort, { once: true });
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort));
  });
}
