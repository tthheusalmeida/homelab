import { IpcMessages } from '../shared/errors';
import type { IpcEvent, IpcEventPayload } from '../shared/events';
import type { IpcResult } from '../shared/result';

type RawListener = (event: unknown, payload: unknown) => void;

export interface IpcRendererLike {
  invoke(channel: string, payload?: unknown): Promise<unknown>;
  on(channel: string, listener: RawListener): unknown;
  removeListener(channel: string, listener: RawListener): unknown;
}

export interface Bridge {
  invoke(channel: string, payload?: unknown): Promise<IpcResult<unknown>>;
  /** Escuta um evento do main; devolve a função que cancela a escuta. */
  on<E extends IpcEvent>(event: E, listener: (payload: IpcEventPayload<E>) => void): () => void;
}

/**
 * Ponte exposta como `window.api`. Só canais e eventos das listas permitidas passam; qualquer outro
 * é rejeitado sem chegar ao main. Nunca expõe o `ipcRenderer` nem o objeto de evento do Electron:
 * quem escuta recebe só o payload.
 */
export function createBridge(
  ipc: IpcRendererLike,
  allowedChannels: readonly string[],
  allowedEvents: readonly string[],
): Bridge {
  const channels = new Set(allowedChannels);
  const events = new Set(allowedEvents);

  return {
    invoke(channel, payload) {
      if (!channels.has(channel)) {
        return Promise.reject(new Error(`${IpcMessages.channelNotAllowed}: ${channel}`));
      }

      return ipc.invoke(channel, payload) as Promise<IpcResult<unknown>>;
    },

    on(event, listener) {
      if (!events.has(event)) {
        throw new Error(`${IpcMessages.eventNotAllowed}: ${event}`);
      }

      const wrapped: RawListener = (_event, payload) => listener(payload as never);

      ipc.on(event, wrapped);

      return () => {
        ipc.removeListener(event, wrapped);
      };
    },
  };
}
