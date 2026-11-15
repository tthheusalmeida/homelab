import { IpcChannels } from '../../shared/channels';
import type { ExternalProvidersService } from '../../providers/external-providers.service';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Canais `providers:external:*`: IAs na nuvem (Gemini e futuras). */
export class ExternalProvidersHandler extends IpcHandler {
  constructor(private readonly providers: ExternalProvidersService) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.providers.external.list, () => this.providers.list()),
      this.route(IpcChannels.providers.external.get, ({ id }) => this.providers.get(id)),
      this.route(IpcChannels.providers.external.save, ({ id, apiKey }) =>
        this.providers.save(id, apiKey),
      ),
      this.route(IpcChannels.providers.external.test, ({ id, apiKey }) =>
        this.providers.test(id, apiKey),
      ),
    ];
  }
}
