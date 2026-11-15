import { IpcChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { AppHandler } from './app.handler';

function setup() {
  const ipc = new FakeIpcMain();
  const appInfo = { version: jest.fn().mockReturnValue('0.0.1'), relaunch: jest.fn() };
  new IpcRegistrar(ipc).register([new AppHandler(appInfo)]);

  return { ipc, appInfo };
}

describe('AppHandler', () => {
  it('when app:ping is called, should answer pong', async () => {
    const { ipc } = setup();

    await expect(ipc.invoke(IpcChannels.app.ping)).resolves.toEqual({ ok: true, data: 'pong' });
  });

  it('when app:version is called, should answer the version from AppInfo', async () => {
    const { ipc, appInfo } = setup();

    await expect(ipc.invoke(IpcChannels.app.version)).resolves.toEqual({
      ok: true,
      data: '0.0.1',
    });
    expect(appInfo.version).toHaveBeenCalledTimes(1);
  });

  it('when app:relaunch is called, should ask AppInfo to relaunch', async () => {
    const { ipc, appInfo } = setup();

    await expect(ipc.invoke(IpcChannels.app.relaunch)).resolves.toMatchObject({ ok: true });
    expect(appInfo.relaunch).toHaveBeenCalledTimes(1);
  });

  it('when AppInfo fails, should answer a failed envelope instead of rejecting', async () => {
    const ipc = new FakeIpcMain();
    const appInfo = {
      version: () => {
        throw new Error('sem versão');
      },
      relaunch: jest.fn(),
    };
    new IpcRegistrar(ipc).register([new AppHandler(appInfo)]);

    await expect(ipc.invoke(IpcChannels.app.version)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INTERNAL', message: 'sem versão' },
    });
  });
});
