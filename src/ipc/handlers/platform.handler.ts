import { IpcChannels } from '../../shared/channels';
import type { PlatformLoginsResult } from '../../shared/contracts/platform';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta dos logins guardados dos sites de vídeo (`PlatformSessions`). */
export interface PlatformLoginsPort {
  forgetLogins(): Promise<number>;
}

/** Canais `platform:*`. Hoje só um: esquecer os logins que o usuário fez para baixar vídeos. */
export class PlatformHandler extends IpcHandler {
  constructor(private readonly logins: PlatformLoginsPort) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.platform.forgetLogins, async (): Promise<PlatformLoginsResult> => ({
        removed: await this.logins.forgetLogins(),
      })),
    ];
  }
}
