import { EXTERNAL_PROVIDER_IDS, type ExternalProviderId } from '../shared/contracts/providers';

import { type ApiKeyChecker } from './api-key-definition';
import { createAnthropicDefinition } from './anthropic.definition';
import type { ExternalProviderDefinition } from './external-providers.service';
import { createGeminiDefinition } from './gemini.definition';

/**
 * Fábrica da definição de cada provider externo. Como é um `Record` por id, o compilador exige uma
 * entrada aqui sempre que um id novo entra em `EXTERNAL_PROVIDER_IDS`.
 */
const FACTORIES: Record<
  ExternalProviderId,
  (checkKey?: ApiKeyChecker) => ExternalProviderDefinition
> = {
  gemini: createGeminiDefinition,
  anthropic: createAnthropicDefinition,
};

/**
 * Definições de todos os providers externos, na ordem de `EXTERNAL_PROVIDER_IDS`. Cada uma testa a
 * chave com a SDK do próprio serviço; `checkers` troca o teste de um provider (nos testes do app).
 */
export function createExternalDefinitions(
  checkers: Partial<Record<ExternalProviderId, ApiKeyChecker>> = {},
): ExternalProviderDefinition[] {
  return EXTERNAL_PROVIDER_IDS.map((id) => FACTORIES[id](checkers[id]));
}
