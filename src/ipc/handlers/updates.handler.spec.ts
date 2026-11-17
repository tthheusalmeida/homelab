import { IpcChannels } from '../../shared/channels';
import type { UpdateStatus } from '../../shared/contracts/updates';
import { IpcErrorCode } from '../../shared/errors';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { UpdatesHandler, UpdatesHandlerMessages } from './updates.handler';

const status = (overrides: Partial<UpdateStatus> = {}): UpdateStatus => ({
  state: 'idle',
  currentVersion: '0.2.0',
  latest: null,
  progress: 0,
  error: null,
  checkedAt: null,
  canInstall: true,
  autoCheck: true,
  ...overrides,
});

function setup() {
  const ipc = new FakeIpcMain();
  const updates = {
    status: jest.fn().mockReturnValue(status()),
    check: jest.fn().mockResolvedValue(status({ checkedAt: 1 })),
    install: jest.fn().mockResolvedValue(status({ state: 'installing' })),
    setAutoCheck: jest.fn((autoCheck: boolean) => status({ autoCheck })),
  };

  new IpcRegistrar(ipc).register([new UpdatesHandler(updates)]);

  return { ipc, updates };
}

describe('UpdatesHandler', () => {
  it('when updates:status is called, should answer the current status', async () => {
    const { ipc } = setup();

    await expect(ipc.invoke(IpcChannels.updates.status)).resolves.toEqual({
      ok: true,
      data: status(),
    });
  });

  it('when updates:check is called, should check now and answer the new status', async () => {
    const { ipc, updates } = setup();

    await expect(ipc.invoke(IpcChannels.updates.check)).resolves.toEqual({
      ok: true,
      data: status({ checkedAt: 1 }),
    });
    expect(updates.check).toHaveBeenCalledTimes(1);
  });

  it('when updates:install is called, should install or download and answer the status', async () => {
    const { ipc, updates } = setup();

    await expect(ipc.invoke(IpcChannels.updates.install)).resolves.toMatchObject({
      ok: true,
      data: { state: 'installing' },
    });
    expect(updates.install).toHaveBeenCalledTimes(1);
  });

  it('when updates:set-auto-check receives a boolean, should save it and answer the status', async () => {
    const { ipc, updates } = setup();

    await expect(
      ipc.invoke(IpcChannels.updates.setAutoCheck, { autoCheck: false }),
    ).resolves.toEqual({ ok: true, data: status({ autoCheck: false }) });
    expect(updates.setAutoCheck).toHaveBeenCalledWith(false);
  });

  it('when updates:set-auto-check receives something else, should answer a validation error', async () => {
    const { ipc, updates } = setup();

    await expect(
      ipc.invoke(IpcChannels.updates.setAutoCheck, { autoCheck: 'yes' }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: IpcErrorCode.VALIDATION, message: UpdatesHandlerMessages.autoCheckInvalid },
    });
    await expect(ipc.invoke(IpcChannels.updates.setAutoCheck)).resolves.toMatchObject({
      ok: false,
    });
    expect(updates.setAutoCheck).not.toHaveBeenCalled();
  });

  it('when the updater fails, should answer a failed envelope instead of rejecting', async () => {
    const ipc = new FakeIpcMain();
    const updates = {
      status: jest.fn(),
      check: jest.fn().mockRejectedValue(new Error('sem rede')),
      install: jest.fn(),
      setAutoCheck: jest.fn(),
    };

    new IpcRegistrar(ipc).register([new UpdatesHandler(updates)]);

    await expect(ipc.invoke(IpcChannels.updates.check)).resolves.toMatchObject({ ok: false });
  });
});
