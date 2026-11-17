import { IpcChannels } from '../../shared/channels';
import type { UpdateStatus } from '../../shared/contracts/updates';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { UpdatesHandler } from './updates.handler';

const status = (overrides: Partial<UpdateStatus> = {}): UpdateStatus => ({
  state: 'idle',
  currentVersion: '0.2.0',
  latest: null,
  progress: 0,
  error: null,
  checkedAt: null,
  canInstall: true,
  ...overrides,
});

function setup() {
  const ipc = new FakeIpcMain();
  const updates = {
    status: jest.fn().mockReturnValue(status()),
    check: jest.fn().mockResolvedValue(status({ checkedAt: 1 })),
    install: jest.fn().mockResolvedValue(status({ state: 'installing' })),
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

  it('when updates:install is called, should start the download and apply', async () => {
    const { ipc, updates } = setup();

    await expect(ipc.invoke(IpcChannels.updates.install)).resolves.toMatchObject({
      ok: true,
      data: { state: 'installing' },
    });
    expect(updates.install).toHaveBeenCalledTimes(1);
  });

  it('when the updater fails, should answer a failed envelope instead of rejecting', async () => {
    const ipc = new FakeIpcMain();
    const updates = {
      status: jest.fn(),
      check: jest.fn().mockRejectedValue(new Error('sem rede')),
      install: jest.fn(),
    };

    new IpcRegistrar(ipc).register([new UpdatesHandler(updates)]);

    await expect(ipc.invoke(IpcChannels.updates.check)).resolves.toMatchObject({ ok: false });
  });
});
