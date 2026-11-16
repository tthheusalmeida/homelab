import { IpcChannels } from '../../shared/channels';
import type {
  ComponentRequest,
  ComponentsInstallRequest,
  ComponentsStatus,
} from '../../shared/contracts/components';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta do `ComponentsService`. */
export interface ComponentsPort {
  status(): Promise<ComponentsStatus>;
  install(ids: string[]): Promise<ComponentsStatus>;
  cancel(): void;
  remove(id: string): Promise<ComponentsStatus>;
  setActiveModel(id: string): Promise<ComponentsStatus>;
}

/**
 * Canais `components:*`. O renderer só manda ids do catálogo; URLs, destinos e checksums ficam no
 * main. O progresso vai pelo evento `components:progress`. Id desconhecido ou instalação em
 * andamento chegam como `VALIDATION`; sem permissão de gravação, `PERSIST_FAILED`.
 */
export class ComponentsHandler extends IpcHandler {
  constructor(private readonly components: ComponentsPort) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.components.status, () => this.components.status()),
      this.route(IpcChannels.components.install, (request: ComponentsInstallRequest) =>
        this.components.install(request.ids),
      ),
      this.route(IpcChannels.components.cancel, () => this.components.cancel()),
      this.route(IpcChannels.components.remove, (request: ComponentRequest) =>
        this.components.remove(request.id),
      ),
      this.route(IpcChannels.components.setActiveModel, (request: ComponentRequest) =>
        this.components.setActiveModel(request.id),
      ),
    ];
  }
}
