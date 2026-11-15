import { IpcChannels } from '../../shared/channels';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

export interface AppInfo {
  version(): string;
  /** Reinicia o app (usado para aplicar mudanças de configuração). */
  relaunch(): void | Promise<void>;
  /** Abre (ou foca) a janela de Configurações. */
  openSettings(): void;
}

/** Canais `app:*`. */
export class AppHandler extends IpcHandler {
  constructor(private readonly appInfo: AppInfo) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.app.ping, () => 'pong' as const),
      this.route(IpcChannels.app.version, () => this.appInfo.version()),
      this.route(IpcChannels.app.relaunch, () => this.appInfo.relaunch()),
      this.route(IpcChannels.app.openSettings, () => this.appInfo.openSettings()),
    ];
  }
}
