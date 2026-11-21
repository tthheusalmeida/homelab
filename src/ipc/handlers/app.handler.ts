import * as path from 'node:path';

import { IpcChannels } from '../../shared/channels';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

export interface AppInfo {
  version(): string;
  /** Reinicia o app (usado para aplicar mudanças de configuração). */
  relaunch(): void | Promise<void>;
  /** Abre (ou foca) a janela de Configurações, já numa seção quando informada. */
  openSettings(section?: string): void;
  /** Mostra o arquivo na pasta dele no gerenciador de arquivos. `false` se ele não existe mais. */
  revealFile(filePath: string): boolean;
  /** Seção pedida ao abrir as Configurações; entregue uma vez só. */
  takeSettingsSection(): string | null;
  /** Se há alteração salva que só vale depois de reiniciar. */
  restartPending(): boolean;
  /** Marca o reinício como pendente e avisa as janelas. */
  markRestartPending(): void;
}

/** Mensagens de validação do `app:reveal-file`. */
export const AppPayloadMessages = {
  path: 'Informe o caminho completo do arquivo.',
} as const;

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
      this.route(IpcChannels.app.revealFile, (request: { path?: unknown } | void) => {
        const target = request && typeof request.path === 'string' ? request.path : '';

        if (target === '' || !path.isAbsolute(target)) {
          throw new IpcError(IpcErrorCode.VALIDATION, AppPayloadMessages.path);
        }

        return this.appInfo.revealFile(target);
      }),
      this.route(IpcChannels.app.settingsSection, () => this.appInfo.takeSettingsSection()),
      this.route(IpcChannels.app.restartPending, () => this.appInfo.restartPending()),
      this.route(IpcChannels.app.markRestartPending, () => this.appInfo.markRestartPending()),
    ];
  }
}
