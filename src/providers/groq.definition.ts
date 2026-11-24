import Groq from 'groq-sdk';

import { type ApiKeyChecker, createApiKeyDefinition } from './api-key-definition';
import type { ExternalProviderDefinition } from './external-providers.service';

export const GroqMessages = {
  ok: 'Conexão com a Groq funcionando.',
  failed: (reason: string) => `Falha ao conectar à Groq: ${reason}`,
} as const;

/** Teste padrão: lista os modelos com a SDK da Groq. */
const checkGroqKeyWithSdk: ApiKeyChecker = async (apiKey) => {
  await new Groq({ apiKey, maxRetries: 0 }).models.list();
};

export function createGroqDefinition(
  checkKey: ApiKeyChecker = checkGroqKeyWithSdk,
): ExternalProviderDefinition {
  return createApiKeyDefinition({
    id: 'groq',
    label: 'Groq',
    secretKey: 'groq.apiKey',
    checkKey,
    okMessage: GroqMessages.ok,
    failedMessage: GroqMessages.failed,
  });
}
