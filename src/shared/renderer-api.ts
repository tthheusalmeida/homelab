import type { IpcChannel } from './channels';
import type { IpcRequest, IpcResponse } from './contracts';
import type { IpcEvent, IpcEventPayload } from './events';
import type { IpcResult } from './result';

/** O que o preload expõe como `window.api`. */
export interface RendererApi {
  invoke<C extends IpcChannel>(
    channel: C,
    ...payload: IpcRequest<C> extends void ? [] : [IpcRequest<C>]
  ): Promise<IpcResult<IpcResponse<C>>>;

  /** Escuta um evento do main; devolve a função que cancela a escuta. */
  on<E extends IpcEvent>(event: E, listener: (payload: IpcEventPayload<E>) => void): () => void;
}
