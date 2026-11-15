import { allChannels } from '../shared/channels';
import { IpcMessages } from '../shared/errors';
import { fail, ok, type IpcResult } from '../shared/result';

import { IpcErrorMapper } from './ipc-error-mapper';
import type { IpcHandler } from './ipc-handler';
import type { IpcMainLike } from './ipc-main-like';

/**
 * Registra as rotas de todos os handlers no Electron, embrulhando cada uma
 * no envelope `IpcResult`. Canal não declarado em `IpcChannels` ou registrado
 * duas vezes é erro de programação e falha na hora.
 */
export class IpcRegistrar {
  private readonly registered = new Set<string>();
  private readonly declared = new Set<string>(allChannels());

  constructor(
    private readonly ipc: IpcMainLike,
    private readonly errors: IpcErrorMapper = new IpcErrorMapper(),
  ) {}

  register(handlers: IpcHandler[]): void {
    for (const handler of handlers) {
      for (const { channel, run } of handler.routes()) {
        this.claim(channel);

        this.ipc.handle(channel, async (_event, payload): Promise<IpcResult<unknown>> => {
          try {
            return ok(await run(payload));
          } catch (error) {
            return fail(this.errors.map(error));
          }
        });
      }
    }
  }

  private claim(channel: string): void {
    if (!this.declared.has(channel)) {
      throw new Error(`${IpcMessages.channelNotDeclared}: ${channel}`);
    }

    if (this.registered.has(channel)) {
      throw new Error(`${IpcMessages.channelAlreadyRegistered}: ${channel}`);
    }

    this.registered.add(channel);
  }
}
