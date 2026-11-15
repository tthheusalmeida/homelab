import type { IpcChannel } from './channels';
import type { IpcRequest, IpcResponse } from './contracts';
import { IpcError } from './errors';
import type { RendererApi } from './renderer-api';

export interface IpcClient {
  invoke<C extends IpcChannel>(
    channel: C,
    ...payload: IpcRequest<C> extends void ? [] : [IpcRequest<C>]
  ): Promise<IpcResponse<C>>;
}

/**
 * Cliente usado pelo front: chama `window.api`, desembrulha o envelope e
 * **lança `IpcError`** quando `ok` é falso, para que hooks e TanStack Query
 * tratem erro como tratam hoje.
 */
export function createIpcClient(api: RendererApi): IpcClient {
  return {
    async invoke(channel, ...payload) {
      const result = await api.invoke(channel, ...payload);

      if (!result.ok) {
        throw new IpcError(result.error.code, result.error.message);
      }

      return result.data;
    },
  };
}
