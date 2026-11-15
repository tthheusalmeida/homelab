import { IpcChannels } from '../../shared/channels';
import type { SettingsService } from '../../settings/settings.service';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Canais `settings:*`: pastas do app. */
export class SettingsHandler extends IpcHandler {
  constructor(private readonly settings: SettingsService) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.settings.get, () => this.settings.getPaths()),
      this.route(IpcChannels.settings.update, (patch) => this.settings.updatePaths(patch)),
    ];
  }
}
