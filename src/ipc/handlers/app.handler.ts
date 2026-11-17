import { IpcChannels } from '../../shared/channels';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

export interface AppInfo {
  version(): string;
  /** Reinicia o app (usado para aplicar mudanças de configuração). */
  relaunch(): void | Promise<void>;
  /** Abre (ou foca) a janela de Configurações, já numa seção quando informada. */
  openSettings(section?: string): void;
  /** Seção pedida ao abrir as Configurações; entregue uma vez só. */
  takeSettingsSection(): string | null;
  /** Se há alteração salva que só vale depois de reiniciar. */
  restartPending(): boolean;
  /** Marca o reinício como pendente e avisa as janelas. */
  markRestartPending(): void;
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
      this.route(IpcChannels.app.openSettings, (request: { section?: string } | void) =>
        this.appInfo.openSettings(request ? request.section : undefined),
      ),
      this.route(IpcChannels.app.settingsSection, () => this.appInfo.takeSettingsSection()),
      this.route(IpcChannels.app.restartPending, () => this.appInfo.restartPending()),
      this.route(IpcChannels.app.markRestartPending, () => this.appInfo.markRestartPending()),
    ];
  }
}
