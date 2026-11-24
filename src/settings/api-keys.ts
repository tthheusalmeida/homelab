import { EXTERNAL_PROVIDER_IDS, type ExternalProviderId } from '../shared/contracts/providers';

import { apiKeySecret, type SecretStore } from './secret-store';

/** Chave de cada provider externo; sem entrada, o provider não está configurado. */
export type ApiKeys = Partial<Record<ExternalProviderId, string | null>>;

/** Lê (e decifra) a chave de todos os providers externos; a decifragem é assíncrona. */
export async function readApiKeys(secrets: Pick<SecretStore, 'get'>): Promise<ApiKeys> {
  const entries = await Promise.all(
    EXTERNAL_PROVIDER_IDS.map(async (id) => [id, await secrets.get(apiKeySecret(id))] as const),
  );

  return Object.fromEntries(entries);
}
