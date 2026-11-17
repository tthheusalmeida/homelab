import { IpcChannels } from '../../shared/channels';
import type { SetAutoCheckRequest, UpdateStatus } from '../../shared/contracts/updates';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

export const UpdatesHandlerMessages = {
  autoCheckInvalid: 'Valor inválido para a verificação automática.',
} as const;

function parseAutoCheck(request: SetAutoCheckRequest | undefined): boolean {
  if (typeof request?.autoCheck !== 'boolean') {
    throw new IpcError(IpcErrorCode.VALIDATION, UpdatesHandlerMessages.autoCheckInvalid);
  }

  return request.autoCheck;
}

/** Porta do `AppUpdater`. */
export interface UpdatesPort {
  status(): UpdateStatus;
  check(): Promise<UpdateStatus>;
  install(): Promise<UpdateStatus>;
  setAutoCheck(autoCheck: boolean): UpdateStatus;
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
      this.route(IpcChannels.updates.setAutoCheck, (request) =>
        this.updates.setAutoCheck(parseAutoCheck(request)),
      ),
    ];
  }
}
