import type { SaveResult, SettingsPaths } from '../shared/contracts/settings';

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
}
