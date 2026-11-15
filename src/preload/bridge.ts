import { IpcMessages } from '../shared/errors';
import type { IpcResult } from '../shared/result';

export interface IpcRendererLike {
  invoke(channel: string, payload?: unknown): Promise<unknown>;
}

export interface Bridge {
  invoke(channel: string, payload?: unknown): Promise<IpcResult<unknown>>;
}

/**
 * Ponte exposta como `window.api`. Só canais da lista permitida passam;
 * qualquer outro é rejeitado sem chegar ao main. Nunca expõe o `ipcRenderer`.
 */
export function createBridge(ipc: IpcRendererLike, allowed: readonly string[]): Bridge {
  const allowedSet = new Set(allowed);

  return {
    invoke(channel, payload) {
      if (!allowedSet.has(channel)) {
        return Promise.reject(new Error(`${IpcMessages.channelNotAllowed}: ${channel}`));
      }

      return ipc.invoke(channel, payload) as Promise<IpcResult<unknown>>;
    },
  };
}
