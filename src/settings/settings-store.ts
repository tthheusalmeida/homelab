import type { SettingsData, SettingsPatch } from '../shared/contracts/settings';

import type { JsonFile } from '../storage/json-file';
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
  private recovered = false;

  constructor(
    private readonly file: JsonFile<SettingsPatch>,
    private readonly defaults: SettingsData,
  ) {
    this.current = this.load();
  }

  /** `true` se o arquivo principal estava ilegível e a cópia `.bak` foi usada (para avisar o usuário). */
  get recoveredFromBackup(): boolean {
    return this.recovered;
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
      const saved = this.file.read();

      this.recovered = this.file.recovered;

      return this.merge(this.defaults, saved ?? {});
    } catch {
      this.file.quarantine();

      return structuredClone(this.defaults);
    }
  }

  private merge(base: SettingsData, patch: SettingsPatch): SettingsData {
    return {
      // Só as chaves conhecidas: valores antigos (pastas, Whisper) que sobraram no arquivo são ignorados.
      paths: { libraryDir: patch.paths?.libraryDir ?? base.paths.libraryDir },
      appearance: {
        ...base.appearance,
        ...patch.appearance,
        reading: { ...base.appearance.reading, ...patch.appearance?.reading },
        transcript: { ...base.appearance.transcript, ...patch.appearance?.transcript },
        summary: { ...base.appearance.summary, ...patch.appearance?.summary },
      },
      updates: { autoCheck: patch.updates?.autoCheck ?? base.updates.autoCheck },
      local: {
        ollama: { url: patch.local?.ollama?.url ?? base.local.ollama.url },
      },
    };
  }
}
