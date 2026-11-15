import type { IpcChannel } from '../src/shared/channels';
import { createIpcClient, type IpcClient } from '../src/shared/ipc-client';

type LooseClient = { invoke(channel: IpcChannel, ...payload: unknown[]): Promise<unknown> };

/**
 * Cliente IPC do renderer. Liga-se ao `window.api` só no momento da chamada,
 * para que os componentes possam ser importados (e testados) sem o preload.
 */
export const ipc: IpcClient = {
  invoke: ((channel: IpcChannel, ...payload: unknown[]) =>
    (createIpcClient(window.api) as unknown as LooseClient).invoke(
      channel,
      ...payload,
    )) as IpcClient['invoke'],
};
