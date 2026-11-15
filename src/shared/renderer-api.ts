import type { IpcChannel } from './channels';
import type { IpcRequest, IpcResponse } from './contracts';
import type { IpcResult } from './result';

/** O que o preload expõe como `window.api`. */
export interface RendererApi {
  invoke<C extends IpcChannel>(
    channel: C,
    ...payload: IpcRequest<C> extends void ? [] : [IpcRequest<C>]
  ): Promise<IpcResult<IpcResponse<C>>>;
}
