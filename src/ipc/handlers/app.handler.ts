import { IpcChannels } from '../../shared/channels';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

export interface AppInfo {
  version(): string;
}

/** Canais `app:*`: prova da infraestrutura IPC (fase 02). */
export class AppHandler extends IpcHandler {
  constructor(private readonly appInfo: AppInfo) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.app.ping, () => 'pong' as const),
      this.route(IpcChannels.app.version, () => this.appInfo.version()),
    ];
  }
}
