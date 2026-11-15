import { IpcChannels } from '../../shared/channels';
import type { SettingsService } from '../../settings/settings.service';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Seletor de pasta do sistema (no Electron: `dialog.showOpenDialog`). */
export interface FolderPicker {
  pick(defaultPath?: string): Promise<string | null>;
}

/** Canais `settings:*`: pastas do app. */
export class SettingsHandler extends IpcHandler {
  constructor(
    private readonly settings: SettingsService,
    private readonly folderPicker: FolderPicker,
  ) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.settings.get, () => this.settings.getPaths()),
      this.route(IpcChannels.settings.update, (patch) => this.settings.updatePaths(patch)),
      this.route(IpcChannels.settings.pickFolder, ({ defaultPath } = {}) =>
        this.folderPicker.pick(defaultPath),
      ),
    ];
  }
}
