import { IpcChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { JobLeftoversHandler, type JobLeftoversPort } from './leftovers.handler';

function setup(overrides: Partial<Record<keyof JobLeftoversPort, jest.Mock>> = {}) {
  const fakes = {
    scan: jest.fn().mockResolvedValue({ files: 3, bytes: 1024 }),
    clean: jest.fn().mockResolvedValue({ files: 3, bytes: 1024, failed: 0 }),
    ...overrides,
  };
  const ipc = new FakeIpcMain();

  new IpcRegistrar(ipc).register([new JobLeftoversHandler(fakes)]);

  return { ipc, fakes };
}

describe('JobLeftoversHandler', () => {
  it('when jobs:leftovers is called, should answer what the cleaner measured', async () => {
    const { ipc } = setup();

    await expect(ipc.invoke(IpcChannels.jobs.leftovers)).resolves.toEqual({
      ok: true,
      data: { files: 3, bytes: 1024 },
    });
  });

  it('when jobs:clean-leftovers is called, should clean and answer what was freed', async () => {
    const { ipc, fakes } = setup();

    await expect(ipc.invoke(IpcChannels.jobs.cleanLeftovers)).resolves.toEqual({
      ok: true,
      data: { files: 3, bytes: 1024, failed: 0 },
    });
    expect(fakes.clean).toHaveBeenCalledTimes(1);
  });

  it('when measuring does not delete anything, should not call clean', async () => {
    const { ipc, fakes } = setup();

    await ipc.invoke(IpcChannels.jobs.leftovers);

    expect(fakes.clean).not.toHaveBeenCalled();
  });
});
