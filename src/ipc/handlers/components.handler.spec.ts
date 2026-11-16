import { IpcChannels } from '../../shared/channels';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { ComponentsHandler, type ComponentsPort } from './components.handler';

type Fakes = Record<keyof ComponentsPort, jest.Mock>;

function setup(overrides: Partial<Fakes> = {}) {
  const status = { components: [], running: false, overall: null, needsSetup: true };
  const fakes: Fakes = {
    status: jest.fn().mockResolvedValue(status),
    install: jest.fn().mockResolvedValue(status),
    cancel: jest.fn(),
    remove: jest.fn().mockResolvedValue(status),
    setActiveModel: jest.fn().mockResolvedValue(status),
    ...overrides,
  };
  const ipc = new FakeIpcMain();

  new IpcRegistrar(ipc).register([new ComponentsHandler(fakes)]);

  return { ipc, fakes, status };
}

describe('ComponentsHandler', () => {
  it('when components:status is called, should answer the status from the service', async () => {
    const { ipc, status } = setup();

    await expect(ipc.invoke(IpcChannels.components.status)).resolves.toEqual({
      ok: true,
      data: status,
    });
  });

  it('when components:install is called, should pass the ids to the service', async () => {
    const { ipc, fakes } = setup();

    await ipc.invoke(IpcChannels.components.install, { ids: ['model-small'] });

    expect(fakes.install).toHaveBeenCalledWith(['model-small']);
  });

  it('when components:cancel is called, should cancel the installation', async () => {
    const { ipc, fakes } = setup();

    await ipc.invoke(IpcChannels.components.cancel);

    expect(fakes.cancel).toHaveBeenCalledTimes(1);
  });

  it('when components:remove and set-active-model are called, should pass the id', async () => {
    const { ipc, fakes } = setup();

    await ipc.invoke(IpcChannels.components.remove, { id: 'model-small' });
    await ipc.invoke(IpcChannels.components.setActiveModel, { id: 'model-base' });

    expect(fakes.remove).toHaveBeenCalledWith('model-small');
    expect(fakes.setActiveModel).toHaveBeenCalledWith('model-base');
  });

  it('when the service rejects with VALIDATION, should answer that code', async () => {
    const { ipc } = setup({
      install: jest.fn().mockRejectedValue(new IpcError(IpcErrorCode.VALIDATION, 'ocupado')),
    });

    const result = await ipc.invoke(IpcChannels.components.install, { ids: ['x'] });

    expect(result).toMatchObject({ ok: false, error: { code: IpcErrorCode.VALIDATION } });
  });
});
