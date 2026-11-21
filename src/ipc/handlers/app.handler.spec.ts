import { IpcChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { AppHandler } from './app.handler';

function setup() {
  const ipc = new FakeIpcMain();
  const appInfo = {
    version: jest.fn().mockReturnValue('0.0.1'),
    relaunch: jest.fn(),
    openSettings: jest.fn(),
    revealFile: jest.fn().mockReturnValue(true),
    takeSettingsSection: jest.fn().mockReturnValue('components'),
    restartPending: jest.fn().mockReturnValue(false),
    markRestartPending: jest.fn(),
  };
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

  it('when app:open-settings is called, should ask AppInfo to open the settings window', async () => {
    const { ipc, appInfo } = setup();

    await expect(ipc.invoke(IpcChannels.app.openSettings)).resolves.toMatchObject({ ok: true });
    expect(appInfo.openSettings).toHaveBeenCalledTimes(1);
  });

  it('when app:open-settings is called with a section, should pass it to AppInfo', async () => {
    const { ipc, appInfo } = setup();

    await ipc.invoke(IpcChannels.app.openSettings, { section: 'components' });

    expect(appInfo.openSettings).toHaveBeenCalledWith('components');
  });

  it('when app:settings-section is called, should answer the pending section from AppInfo', async () => {
    const { ipc } = setup();

    await expect(ipc.invoke(IpcChannels.app.settingsSection)).resolves.toEqual({
      ok: true,
      data: 'components',
    });
  });

  it('when AppInfo fails, should answer a failed envelope instead of rejecting', async () => {
    const ipc = new FakeIpcMain();
    const appInfo = {
      version: () => {
        throw new Error('sem versão');
      },
      relaunch: jest.fn(),
      openSettings: jest.fn(),
      revealFile: jest.fn(),
      takeSettingsSection: jest.fn(),
      restartPending: jest.fn(),
      markRestartPending: jest.fn(),
    };
    new IpcRegistrar(ipc).register([new AppHandler(appInfo)]);

    await expect(ipc.invoke(IpcChannels.app.version)).resolves.toMatchObject({
      ok: false,
      error: { code: 'INTERNAL', message: 'sem versão' },
    });
  });

  it('when app:restart-pending is called, should answer whether a restart is pending', async () => {
    const { ipc, appInfo } = setup();
    appInfo.restartPending.mockReturnValue(true);

    await expect(ipc.invoke(IpcChannels.app.restartPending)).resolves.toEqual({
      ok: true,
      data: true,
    });
    expect(appInfo.restartPending).toHaveBeenCalledTimes(1);
  });

  it('when app:mark-restart-pending is called, should ask AppInfo to mark the restart as pending', async () => {
    const { ipc, appInfo } = setup();

    await expect(ipc.invoke(IpcChannels.app.markRestartPending)).resolves.toMatchObject({
      ok: true,
    });
    expect(appInfo.markRestartPending).toHaveBeenCalledTimes(1);
  });

  it('when app:reveal-file is called with a full path, should ask AppInfo to reveal it', async () => {
    const { ipc, appInfo } = setup();
    const file = process.platform === 'win32' ? 'C:\\docs\\mapa.png' : '/docs/mapa.png';

    await expect(ipc.invoke(IpcChannels.app.revealFile, { path: file })).resolves.toEqual({
      ok: true,
      data: true,
    });
    expect(appInfo.revealFile).toHaveBeenCalledWith(file);
  });

  it('when the file no longer exists, should answer false', async () => {
    const { ipc, appInfo } = setup();
    const file = process.platform === 'win32' ? 'C:\\docs\\sumiu.png' : '/docs/sumiu.png';

    appInfo.revealFile.mockReturnValue(false);

    await expect(ipc.invoke(IpcChannels.app.revealFile, { path: file })).resolves.toEqual({
      ok: true,
      data: false,
    });
  });

  it.each([undefined, {}, { path: '' }, { path: 'relativo/arquivo.png' }, { path: 42 }])(
    'when app:reveal-file gets %j, should refuse it as invalid and not touch the system',
    async (request) => {
      const { ipc, appInfo } = setup();

      await expect(ipc.invoke(IpcChannels.app.revealFile, request)).resolves.toMatchObject({
        ok: false,
        error: { code: 'VALIDATION' },
      });
      expect(appInfo.revealFile).not.toHaveBeenCalled();
    },
  );

  it('when no restart is pending, should answer false', async () => {
    const { ipc } = setup();

    await expect(ipc.invoke(IpcChannels.app.restartPending)).resolves.toEqual({
      ok: true,
      data: false,
    });
  });
});
