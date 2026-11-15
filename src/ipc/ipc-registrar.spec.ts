import { IpcChannels } from '../shared/channels';
import { IpcError, IpcErrorCode } from '../shared/errors';

import { IpcHandler, type IpcRoute } from './ipc-handler';
import { IpcRegistrar } from './ipc-registrar';
import { FakeIpcMain } from './testing/fake-ipc-main';

class FakeHandler extends IpcHandler {
  constructor(private readonly list: IpcRoute[]) {
    super();
  }

  routes(): IpcRoute[] {
    return this.list;
  }
}

const route = (channel: string, run: (payload: unknown) => unknown): IpcRoute => ({
  channel: channel as IpcRoute['channel'],
  run,
});

describe('IpcRegistrar', () => {
  it('when registering handlers, should register every route in the ipc', () => {
    const ipc = new FakeIpcMain();

    new IpcRegistrar(ipc).register([
      new FakeHandler([
        route(IpcChannels.app.ping, () => 'pong'),
        route(IpcChannels.app.version, () => '1'),
      ]),
    ]);

    expect(ipc.channels()).toEqual([IpcChannels.app.ping, IpcChannels.app.version]);
  });

  it('when a route succeeds, should answer with an ok envelope', async () => {
    const ipc = new FakeIpcMain();
    new IpcRegistrar(ipc).register([
      new FakeHandler([route(IpcChannels.app.ping, () => Promise.resolve('pong'))]),
    ]);

    await expect(ipc.invoke(IpcChannels.app.ping)).resolves.toEqual({ ok: true, data: 'pong' });
  });

  it('when a route receives a payload, should pass it to the runner', async () => {
    const ipc = new FakeIpcMain();
    const run = jest.fn().mockReturnValue('x');
    new IpcRegistrar(ipc).register([new FakeHandler([route(IpcChannels.app.version, run)])]);

    await ipc.invoke(IpcChannels.app.version, { a: 1 });

    expect(run).toHaveBeenCalledWith({ a: 1 });
  });

  it('when a route throws an IpcError, should answer with a failed envelope keeping the code', async () => {
    const ipc = new FakeIpcMain();
    new IpcRegistrar(ipc).register([
      new FakeHandler([
        route(IpcChannels.app.ping, () => {
          throw new IpcError(IpcErrorCode.NOT_CONFIGURED, 'Falta configurar');
        }),
      ]),
    ]);

    await expect(ipc.invoke(IpcChannels.app.ping)).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_CONFIGURED', message: 'Falta configurar' },
    });
  });

  it('when an async route rejects with a plain Error, should answer with INTERNAL and not reject', async () => {
    const ipc = new FakeIpcMain();
    new IpcRegistrar(ipc).register([
      new FakeHandler([route(IpcChannels.app.ping, () => Promise.reject(new Error('quebrou')))]),
    ]);

    await expect(ipc.invoke(IpcChannels.app.ping)).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'quebrou' },
    });
  });

  it('when the same channel is registered twice, should throw', () => {
    const registrar = new IpcRegistrar(new FakeIpcMain());
    const handler = new FakeHandler([route(IpcChannels.app.ping, () => 'pong')]);

    expect(() => registrar.register([handler, handler])).toThrow(/já registrado/);
  });

  it('when a channel is not declared in IpcChannels, should throw', () => {
    const registrar = new IpcRegistrar(new FakeIpcMain());

    expect(() => registrar.register([new FakeHandler([route('x:y', () => 1)])])).toThrow(
      /não declarado/,
    );
  });
});
