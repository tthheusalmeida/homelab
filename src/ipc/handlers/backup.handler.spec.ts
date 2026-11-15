import { IpcChannels } from '../../shared/channels';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { BackupHandler, type BackupPort } from './backup.handler';

type Fakes = Record<keyof BackupPort, jest.Mock>;

function setup(overrides: Partial<Fakes> = {}) {
  const fakes: Fakes = {
    preview: jest.fn().mockResolvedValue({ items: [], notIncluded: [] }),
    create: jest.fn().mockResolvedValue({ cancelled: true }),
    cancel: jest.fn(),
    inspect: jest.fn().mockResolvedValue(null),
    restore: jest
      .fn()
      .mockResolvedValue({ items: [], safetyCopyPath: null, restartRequired: false }),
    ...overrides,
  };
  const ipc = new FakeIpcMain();

  new IpcRegistrar(ipc).register([new BackupHandler(fakes)]);

  return { ipc, fakes };
}

describe('BackupHandler', () => {
  it('when backup:preview is called, should answer the preview from the service', async () => {
    const preview = { items: [{ id: 'library' }], notIncluded: ['secrets'] };
    const { ipc } = setup({ preview: jest.fn().mockResolvedValue(preview) });

    await expect(ipc.invoke(IpcChannels.backup.preview)).resolves.toEqual({
      ok: true,
      data: preview,
    });
  });

  it('when backup:create is called, should pass the chosen items and answer the result', async () => {
    const result = { cancelled: false, path: 'D:/b.zip', bytes: 10, files: 3 };
    const { ipc, fakes } = setup({ create: jest.fn().mockResolvedValue(result) });

    await expect(
      ipc.invoke(IpcChannels.backup.create, { items: ['library', 'chats'] }),
    ).resolves.toEqual({ ok: true, data: result });
    expect(fakes.create).toHaveBeenCalledWith({ items: ['library', 'chats'] });
  });

  it('when backup:cancel is called, should ask the service to cancel and answer ok', async () => {
    const { ipc, fakes } = setup();

    await expect(ipc.invoke(IpcChannels.backup.cancel)).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(fakes.cancel).toHaveBeenCalledTimes(1);
  });

  it('when backup:inspect is called, should answer what the service found, or null when the user cancels', async () => {
    const inspection = { token: 't', fileName: 'b.zip', createdAt: '', appVersion: '1', items: [] };
    const { ipc } = setup({
      inspect: jest.fn().mockResolvedValueOnce(inspection).mockResolvedValueOnce(null),
    });

    await expect(ipc.invoke(IpcChannels.backup.inspect)).resolves.toEqual({
      ok: true,
      data: inspection,
    });
    await expect(ipc.invoke(IpcChannels.backup.inspect)).resolves.toEqual({ ok: true, data: null });
  });

  it('when backup:restore is called, should pass token, items and mode and answer the result', async () => {
    const result = {
      items: [{ id: 'library', added: 2, skipped: 0 }],
      safetyCopyPath: null,
      restartRequired: false,
    };
    const request = { token: 't', items: ['library'], mode: 'merge' };
    const { ipc, fakes } = setup({ restore: jest.fn().mockResolvedValue(result) });

    await expect(ipc.invoke(IpcChannels.backup.restore, request)).resolves.toEqual({
      ok: true,
      data: result,
    });
    expect(fakes.restore).toHaveBeenCalledWith(request);
  });

  it.each([
    [IpcErrorCode.VALIDATION, 'Este arquivo não é um backup do HomeLab válido.'],
    [IpcErrorCode.PERSIST_FAILED, 'Não foi possível criar o backup: disco cheio'],
  ])('when the service fails with %s, should keep the code and message', async (code, message) => {
    const { ipc } = setup({ create: jest.fn().mockRejectedValue(new IpcError(code, message)) });

    await expect(ipc.invoke(IpcChannels.backup.create, { items: ['library'] })).resolves.toEqual({
      ok: false,
      error: { code, message },
    });
  });
});
