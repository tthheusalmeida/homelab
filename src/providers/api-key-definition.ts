import type { ExternalProviderId } from '../shared/contracts/providers';
import type { SecretKey } from '../settings/secret-store';

import type { ExternalProviderDefinition } from './external-providers.service';

/** Verifica a chave chamando o serviço (no Electron, listando os modelos); lança se falhar. */
export type ApiKeyChecker = (apiKey: string) => Promise<void>;

export interface ApiKeyDefinitionOptions {
  id: ExternalProviderId;
  label: string;
  secretKey: SecretKey;
  checkKey: ApiKeyChecker;
  okMessage: string;
  failedMessage: (reason: string) => string;
  /** Extrai um texto útil do erro da SDK; sem isto usa a mensagem do erro. */
  readError?: (error: unknown) => string;
}

/**
 * Definição de um provider externo que se configura só com uma chave de API: o teste chama o
 * serviço e devolve `{ ok, message }`, sem nunca lançar. Gemini e Anthropic só trocam as mensagens
 * e a forma de ler o erro.
 */
export function createApiKeyDefinition(
  options: ApiKeyDefinitionOptions,
): ExternalProviderDefinition {
  const readError =
    options.readError ?? ((error) => (error instanceof Error ? error.message : String(error)));

  return {
    id: options.id,
    label: options.label,
    secretKey: options.secretKey,
    async test(apiKey) {
      try {
        await options.checkKey(apiKey);
      } catch (error) {
        return { ok: false, message: options.failedMessage(readError(error)) };
      }

      return { ok: true, message: options.okMessage };
    },
  };
}
