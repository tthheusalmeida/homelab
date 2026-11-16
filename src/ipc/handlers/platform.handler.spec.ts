import { IpcChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { PlatformHandler } from './platform.handler';

describe('PlatformHandler', () => {
  it('when the user forgets the logins, should answer how many were removed', async () => {
    const forgetLogins = jest.fn().mockResolvedValue(3);
    const ipc = new FakeIpcMain();

    new IpcRegistrar(ipc).register([new PlatformHandler({ forgetLogins })]);

    await expect(ipc.invoke(IpcChannels.platform.forgetLogins)).resolves.toEqual({
      ok: true,
      data: { removed: 3 },
    });
  });
});
