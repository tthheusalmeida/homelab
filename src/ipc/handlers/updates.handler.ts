import { IpcChannels } from '../../shared/channels';
import type { UpdateStatus } from '../../shared/contracts/updates';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta do `AppUpdater`. */
export interface UpdatesPort {
  status(): UpdateStatus;
  check(): Promise<UpdateStatus>;
  install(): Promise<UpdateStatus>;
}

/**
 * Canais `updates:*`. O renderer só pede ações; endereços, versões e checksums ficam no main. O
 * andamento (nova versão, download, erro) chega pelo evento `updates:changed`.
 */
export class UpdatesHandler extends IpcHandler {
  constructor(private readonly updates: UpdatesPort) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.updates.status, () => this.updates.status()),
      this.route(IpcChannels.updates.check, () => this.updates.check()),
      this.route(IpcChannels.updates.install, () => this.updates.install()),
    ];
  }
}
