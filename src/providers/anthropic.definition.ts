import { type ApiKeyChecker, createApiKeyDefinition } from './api-key-definition';
import type { ExternalProviderDefinition } from './external-providers.service';

export const AnthropicMessages = {
  ok: 'Conexão com a Anthropic funcionando.',
  failed: (reason: string) => `Falha ao conectar à Anthropic: ${reason}`,
} as const;

/** Verifica a chave listando os modelos (mesma checagem do health do back). */
export type AnthropicKeyChecker = ApiKeyChecker;

export function createAnthropicDefinition(
  checkKey: AnthropicKeyChecker,
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
