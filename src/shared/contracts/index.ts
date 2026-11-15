import type { IpcChannel, IpcChannels } from '../channels';

/**
 * Contrato de cada canal: payload (`request`) e retorno (`response`).
 * Cada fase acrescenta aqui os canais do seu domínio.
 */
export interface IpcContracts {
  [IpcChannels.app.ping]: { request: void; response: 'pong' };
  [IpcChannels.app.version]: { request: void; response: string };
}

export type IpcRequest<C extends IpcChannel> = IpcContracts[C]['request'];
export type IpcResponse<C extends IpcChannel> = IpcContracts[C]['response'];
