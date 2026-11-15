import { IpcChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { NoticeHandler } from './notice.handler';

describe('NoticeHandler', () => {
  it('when notices:pending is called, should answer what the buffer hands over', async () => {
    const pending = [{ id: 'a', level: 'warning', title: 'Aviso' }];
    const notices = { drain: jest.fn().mockReturnValue(pending) };
    const ipc = new FakeIpcMain();

    new IpcRegistrar(ipc).register([new NoticeHandler(notices)]);

    await expect(ipc.invoke(IpcChannels.notices.pending)).resolves.toEqual({
      ok: true,
      data: pending,
    });
    expect(notices.drain).toHaveBeenCalledTimes(1);
  });
});
