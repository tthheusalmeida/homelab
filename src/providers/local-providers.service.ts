import type {
  LocalProviderId,
  LocalProviderInfo,
  LocalProviderSaveResult,
  ProviderTestResult,
} from '../shared/contracts/providers';
import type { SettingsData, SettingsPatch } from '../shared/contracts/settings';
import { IpcError, IpcErrorCode } from '../shared/errors';
import type { SettingsStore } from '../settings/settings-store';

export const LocalProviderMessages = {
  notFound: (id: string) => `Provider local não encontrado: ${id}`,
  notEditable: (label: string) => `${label} não é configurável nesta versão.`,
  testFailed: 'Não foi possível testar o provider.',
} as const;

/** Um provider local (roda na máquina). Novos entram só registrando outra definição. */
export interface LocalProviderDefinition {
  id: LocalProviderId;
  label: string;
  editable: boolean;
  read(settings: SettingsData): Record<string, string>;
  toPatch(config: Record<string, string>): SettingsPatch;
  test(config: Record<string, string>): Promise<ProviderTestResult>;
}

export class LocalProvidersService {
  private readonly definitions: Map<LocalProviderId, LocalProviderDefinition>;

  constructor(
    definitions: LocalProviderDefinition[],
    private readonly settings: SettingsStore,
  ) {
    this.definitions = new Map(definitions.map((definition) => [definition.id, definition]));
  }

  list(): LocalProviderInfo[] {
    return [...this.definitions.values()].map((definition) => this.info(definition));
  }

  get(id: LocalProviderId): LocalProviderInfo {
    return this.info(this.definition(id));
  }

  save(id: LocalProviderId, config: Record<string, string>): LocalProviderSaveResult {
    const definition = this.definition(id);

    if (!definition.editable) {
      throw new IpcError(
        IpcErrorCode.VALIDATION,
        LocalProviderMessages.notEditable(definition.label),
      );
    }

    const { changed } = this.settings.update(definition.toPatch(config));

    return { value: this.info(definition), restartRequired: changed };
  }

  async test(id: LocalProviderId, config?: Record<string, string>): Promise<ProviderTestResult> {
    const definition = this.definition(id);
    const effective = { ...definition.read(this.settings.get()), ...config };

    try {
      return await definition.test(effective);
    } catch (error) {
      const detail = error instanceof Error && error.message ? `: ${error.message}` : '';

      return { ok: false, message: `${LocalProviderMessages.testFailed}${detail}` };
    }
  }

  private definition(id: LocalProviderId): LocalProviderDefinition {
    const definition = this.definitions.get(id);

    if (!definition) {
      throw new IpcError(IpcErrorCode.NOT_FOUND, LocalProviderMessages.notFound(id));
    }

    return definition;
  }

  private info(definition: LocalProviderDefinition): LocalProviderInfo {
    return {
      id: definition.id,
      label: definition.label,
      editable: definition.editable,
      config: definition.read(this.settings.get()),
    };
  }
}
