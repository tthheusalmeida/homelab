export interface WaitForBackendOptions {
  url: string;
  retries: number;
  delayMs: number;
  fetchFn?: (url: string) => Promise<{ ok: boolean }>;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Faz polling na URL de health até responder ok; devolve `false` ao esgotar as tentativas. */
export async function waitForBackend({
  url,
  retries,
  delayMs,
  fetchFn = (target) => fetch(target),
  sleep = defaultSleep,
}: WaitForBackendOptions): Promise<boolean> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetchFn(url);

      if (response.ok) {
        return true;
      }
    } catch {
      // back ainda subindo; tenta de novo
    }

    await sleep(delayMs);
  }

  return false;
}
