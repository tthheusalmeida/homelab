import { BackConfig } from '../back/config/back-config';

import type { SettingsStore } from './settings-store';

/**
 * `BackConfig` sobre o Settings do desktop: pastas e URL do Ollama vêm do `settings.json` (valores
 * atuais a cada leitura) e a chave do Gemini, dos segredos cifrados (lida uma vez, na inicialização,
 * porque a decifragem é assíncrona e o provider a usa ao ser criado).
 */
export class SettingsBackConfig extends BackConfig {
  constructor(
    private readonly settings: SettingsStore,
    readonly geminiApiKey: string | null,
    readonly usageFile: string | null = null,
  ) {
    super();
  }

  get libraryDir(): string {
    return this.settings.get().paths.libraryDir;
  }

  get inboxDir(): string {
    return this.settings.get().paths.inboxDir;
  }

  get videoTempDir(): string {
    return this.settings.get().paths.videoTempDir;
  }

  get audioTempDir(): string {
    return this.settings.get().paths.audioTempDir;
  }

  get ollamaUrl(): string {
    return this.settings.get().local.ollama.url;
  }
}
