import type { Appearance, AppearancePatch } from '../shared/contracts/appearance';
import type { SaveResult, SettingsPaths, SupportSettings } from '../shared/contracts/settings';

import type { SettingsStore } from './settings-store';

/** Pastas do app (canais `settings:*`). Providers têm serviços próprios. */
export class SettingsService {
  constructor(private readonly store: SettingsStore) {}

  getPaths(): SettingsPaths {
    return this.store.get().paths;
  }

  updatePaths(patch: Partial<SettingsPaths>): SaveResult<SettingsPaths> {
    const { settings, changed } = this.store.update({ paths: patch });

    return { value: settings.paths, restartRequired: changed };
  }

  getAppearance(): Appearance {
    return this.store.get().appearance;
  }

  /** Tema, cor e leitura valem na hora, sem reiniciar. */
  updateAppearance(patch: AppearancePatch): Appearance {
    return this.store.update({ appearance: patch }).settings.appearance;
  }

  getSupport(): SupportSettings {
    return this.store.get().support;
  }

  updateSupport(patch: Partial<SupportSettings>): SupportSettings {
    return this.store.update({ support: patch }).settings.support;
  }
}
