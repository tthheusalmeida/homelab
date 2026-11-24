import { IpcChannels } from '../../shared/channels';
import type {
  LibraryFolderInfo,
  MoveLibraryRequest,
  MoveLibraryResult,
} from '../../shared/contracts/settings';
import type { SettingsService } from '../../settings/settings.service';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Seletor de pasta do sistema (no Electron: `dialog.showOpenDialog`). */
export interface FolderPicker {
  pick(defaultPath?: string): Promise<string | null>;
}

/** Troca da pasta da biblioteca (no app: `LibraryMover`). */
export interface LibraryFolderPort {
  inspect(folder: string): Promise<LibraryFolderInfo>;
  apply(request: MoveLibraryRequest): Promise<MoveLibraryResult>;
}

/** Canais `settings:*` (pastas), `appearance:*` (tema e cor de destaque) e `ai:default-update` (IA padrão). */
export class SettingsHandler extends IpcHandler {
  constructor(
    private readonly settings: SettingsService,
    private readonly folderPicker: FolderPicker,
    private readonly library: LibraryFolderPort,
  ) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.settings.get, () => this.settings.getPaths()),
      this.route(IpcChannels.settings.update, (patch) => this.settings.updatePaths(patch)),
      this.route(IpcChannels.appearance.get, () => this.settings.getAppearance()),
      this.route(IpcChannels.appearance.update, (patch) => this.settings.updateAppearance(patch)),
      this.route(IpcChannels.ai.defaultUpdate, ({ preference }) =>
        this.settings.updateAiDefault(preference),
      ),
      this.route(IpcChannels.support.get, () => this.settings.getSupport()),
      this.route(IpcChannels.support.update, (patch) => this.settings.updateSupport(patch)),
      this.route(IpcChannels.settings.inspectLibrary, ({ path }) => this.library.inspect(path)),
      this.route(IpcChannels.settings.moveLibrary, (request) => this.library.apply(request)),
      this.route(IpcChannels.settings.pickFolder, ({ defaultPath } = {}) =>
        this.folderPicker.pick(defaultPath),
      ),
    ];
  }
}
