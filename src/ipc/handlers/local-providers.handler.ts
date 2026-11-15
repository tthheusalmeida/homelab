import { IpcChannels } from '../../shared/channels';
import type { LocalProvidersService } from '../../providers/local-providers.service';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Canais `providers:local:*`: Whisper, Ollama e ffmpeg. */
export class LocalProvidersHandler extends IpcHandler {
  constructor(private readonly providers: LocalProvidersService) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.providers.local.list, () => this.providers.list()),
      this.route(IpcChannels.providers.local.get, ({ id }) => this.providers.get(id)),
      this.route(IpcChannels.providers.local.save, ({ id, config }) =>
        this.providers.save(id, config),
      ),
      this.route(IpcChannels.providers.local.test, ({ id, config }) =>
        this.providers.test(id, config),
      ),
    ];
  }
}
