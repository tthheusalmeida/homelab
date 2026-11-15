import { allChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { createHandlers } from './index';

describe('createHandlers', () => {
  it('when all handlers are registered, should cover every channel declared in IpcChannels', () => {
    const ipc = new FakeIpcMain();

    new IpcRegistrar(ipc).register(createHandlers({ appInfo: { version: () => '0.0.1' } }));

    expect([...ipc.channels()].sort()).toEqual([...allChannels()].sort());
  });
});
