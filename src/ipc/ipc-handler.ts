import type { IpcChannel } from '../shared/channels';
import type { IpcRequest, IpcResponse } from '../shared/contracts';

/** Uma rota: canal + função que recebe o payload e devolve os dados (sem envelope). */
export interface IpcRoute {
  channel: IpcChannel;
  run: (payload: unknown) => unknown;
}

/**
 * Base dos handlers (um por domínio). O handler só declara canais e delega
 * ao service; envelope de resultado, mapeamento de erro e registro no
 * Electron são responsabilidade do `IpcRegistrar`.
 */
export abstract class IpcHandler {
  abstract routes(): IpcRoute[];

  /** Declara uma rota com payload e retorno tipados pelo contrato do canal. */
  protected route<C extends IpcChannel>(
    channel: C,
    run: (payload: IpcRequest<C>) => Promise<IpcResponse<C>> | IpcResponse<C>,
  ): IpcRoute {
    return { channel, run: run as (payload: unknown) => unknown };
  }
}
