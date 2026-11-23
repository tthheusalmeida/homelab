import Anthropic from '@anthropic-ai/sdk';

import { type ApiKeyChecker, createApiKeyDefinition } from './api-key-definition';
import type { ExternalProviderDefinition } from './external-providers.service';

export const AnthropicMessages = {
  ok: 'Conexão com a Anthropic funcionando.',
  failed: (reason: string) => `Falha ao conectar à Anthropic: ${reason}`,
} as const;

/** Verifica a chave listando os modelos (mesma checagem do health do back). */
export type AnthropicKeyChecker = ApiKeyChecker;

/** Teste padrão: lista os modelos com a SDK da Anthropic. */
const checkAnthropicKeyWithSdk: AnthropicKeyChecker = async (apiKey) => {
  await new Anthropic({ apiKey, maxRetries: 0 }).models.list({ limit: 1 });
};

export function createAnthropicDefinition(
  checkKey: AnthropicKeyChecker = checkAnthropicKeyWithSdk,
): ExternalProviderDefinition {
  return createApiKeyDefinition({
    id: 'anthropic',
    label: 'Anthropic',
    secretKey: 'anthropic.apiKey',
    checkKey,
    okMessage: AnthropicMessages.ok,
    failedMessage: AnthropicMessages.failed,
  });
}
