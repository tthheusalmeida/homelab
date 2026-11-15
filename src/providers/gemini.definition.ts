import type { ExternalProviderDefinition } from './external-providers.service';

export const GeminiMessages = {
  ok: 'Conexão com o Gemini funcionando.',
  failed: (reason: string) => `Falha ao conectar ao Gemini: ${reason}`,
} as const;

/** Verifica a chave listando os modelos (mesma checagem do health do back). */
export type GeminiKeyChecker = (apiKey: string) => Promise<void>;

/**
 * A SDK do Gemini devolve o corpo do erro como JSON dentro da mensagem
 * (`{"error":{"message":"API key not valid…"}}`); extrai só o texto útil.
 */
export function readableGeminiError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);

  try {
    const message = (JSON.parse(raw) as { error?: { message?: unknown } }).error?.message;

    if (typeof message === 'string' && message.trim()) {
      return message.trim();
    }
  } catch {
    // não é JSON: usa a mensagem original
  }

  return raw;
}

export function createGeminiDefinition(checkKey: GeminiKeyChecker): ExternalProviderDefinition {
  return {
    id: 'gemini',
    label: 'Gemini',
    secretKey: 'gemini.apiKey',
    async test(apiKey) {
      try {
        await checkKey(apiKey);
      } catch (error) {
        return { ok: false, message: GeminiMessages.failed(readableGeminiError(error)) };
      }

      return { ok: true, message: GeminiMessages.ok };
    },
  };
}
