import type { SettingsData, SettingsPatch } from '../shared/contracts/settings';

import type { JsonFile } from './json-file';
import { validateSettings } from './settings-validator';

export interface SettingsUpdateResult {
  settings: SettingsData;
  changed: boolean;
}

/**
 * Guarda as configurações do app em `settings.json`.
 * - Valores ausentes no arquivo recebem o padrão (compatível com versões futuras).
 * - Arquivo ilegível vai para `.corrupt` e o app segue com os padrões.
 * - Toda gravação é validada antes de ir ao disco.
 */
export class SettingsStore {
  private current: SettingsData;

  constructor(
    private readonly file: JsonFile<SettingsPatch>,
    private readonly defaults: SettingsData,
  ) {
    this.current = this.load();
  }

  /** Se ainda não existe arquivo salvo (primeira execução). */
  isFirstRun(): boolean {
    return !this.file.exists();
  }

  get(): SettingsData {
    return structuredClone(this.current);
  }

  update(patch: SettingsPatch): SettingsUpdateResult {
    const next = this.merge(this.current, patch);

    validateSettings(next);

    const changed = JSON.stringify(next) !== JSON.stringify(this.current);

    if (changed || this.isFirstRun()) {
      this.file.write(next);
    }

    this.current = next;

    return { settings: this.get(), changed };
  }

  private load(): SettingsData {
    try {
      return this.merge(this.defaults, this.file.read() ?? {});
    } catch {
      this.file.quarantine();

      return structuredClone(this.defaults);
    }
  }

  private merge(base: SettingsData, patch: SettingsPatch): SettingsData {
    return {
      paths: { ...base.paths, ...patch.paths },
      local: {
        whisper: { ...base.local.whisper, ...patch.local?.whisper },
        ollama: { ...base.local.ollama, ...patch.local?.ollama },
      },
    };
  }
}
