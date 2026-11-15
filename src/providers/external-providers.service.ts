import type {
  ExternalProviderId,
  ExternalProviderInfo,
  ExternalProviderSaveResult,
  ProviderTestResult,
} from '../shared/contracts/providers';
import { IpcError, IpcErrorCode } from '../shared/errors';
import { maskSecret, type SecretKey, type SecretStore } from '../settings/secret-store';

export const ExternalProviderMessages = {
  notFound: (id: string) => `Provider externo não encontrado: ${id}`,
  apiKeyRequired: 'Informe a chave da API.',
  testFailed: 'Não foi possível testar a conexão.',
} as const;

/** Um provider externo (IA na nuvem). Novas fontes entram só registrando outra definição. */
export interface ExternalProviderDefinition {
  id: ExternalProviderId;
  label: string;
  secretKey: SecretKey;
  /** Valida a chave chamando o serviço; lança se a conexão falhar. */
  test(apiKey: string): Promise<ProviderTestResult>;
}

export class ExternalProvidersService {
  private readonly definitions: Map<ExternalProviderId, ExternalProviderDefinition>;

  constructor(
    definitions: ExternalProviderDefinition[],
    private readonly secrets: SecretStore,
  ) {
    this.definitions = new Map(definitions.map((definition) => [definition.id, definition]));
  }

  list(): Promise<ExternalProviderInfo[]> {
    return Promise.all([...this.definitions.values()].map((definition) => this.info(definition)));
  }

  async get(id: ExternalProviderId): Promise<ExternalProviderInfo> {
    return this.info(this.definition(id));
  }

  async save(id: ExternalProviderId, apiKey: string): Promise<ExternalProviderSaveResult> {
    const definition = this.definition(id);
    const key = apiKey?.trim();

    if (!key) {
      throw new IpcError(IpcErrorCode.VALIDATION, ExternalProviderMessages.apiKeyRequired);
    }

    const changed = (await this.secrets.get(definition.secretKey)) !== key;

    await this.secrets.set(definition.secretKey, key);

    return { value: await this.info(definition), restartRequired: changed };
  }

  async test(id: ExternalProviderId, apiKey?: string): Promise<ProviderTestResult> {
    const definition = this.definition(id);
    const key = apiKey?.trim() || (await this.secrets.get(definition.secretKey));

    if (!key) {
      return { ok: false, message: ExternalProviderMessages.apiKeyRequired };
    }

    try {
      return await definition.test(key);
    } catch (error) {
      const detail = error instanceof Error && error.message ? `: ${error.message}` : '';

      return { ok: false, message: `${ExternalProviderMessages.testFailed}${detail}` };
    }
  }

  private definition(id: ExternalProviderId): ExternalProviderDefinition {
    const definition = this.definitions.get(id);

    if (!definition) {
      throw new IpcError(IpcErrorCode.NOT_FOUND, ExternalProviderMessages.notFound(id));
    }

    return definition;
  }

  private async info(definition: ExternalProviderDefinition): Promise<ExternalProviderInfo> {
    const key = await this.secrets.get(definition.secretKey);

    return {
      id: definition.id,
      label: definition.label,
      configured: key !== null,
      maskedKey: key ? maskSecret(key) : null,
    };
  }
}
