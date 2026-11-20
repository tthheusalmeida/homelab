import { IpcChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { LibraryHandler, type LibraryReader, type LibraryWriter } from './library.handler';

/** Exceção do Nest (duck typing: o mapper só olha `getStatus`). */
class HttpLikeError extends Error {
  constructor(
    message: string,
    private readonly status: number,
  ) {
    super(message);
  }

  getStatus() {
    return this.status;
  }
}

function setup(fakes: Partial<Record<'createCategory' | 'deleteCategory', jest.Mock>>) {
  const library = fakes as unknown as LibraryReader & LibraryWriter;
  const ipc = new FakeIpcMain();

  new IpcRegistrar(ipc).register([new LibraryHandler(library, { suggest: jest.fn() })]);

  return ipc;
}

describe('LibraryHandler: criar e excluir categoria', () => {
  it('when library:categories:create is called, should hand the path to the service', async () => {
    const createCategory = jest.fn().mockResolvedValue({ created: true });
    const ipc = setup({ createCategory });

    await expect(
      ipc.invoke(IpcChannels.library.createCategory, { path: ['Redes', 'Segurança'] }),
    ).resolves.toEqual({ ok: true, data: { created: true } });
    expect(createCategory).toHaveBeenCalledWith(['Redes', 'Segurança']);
  });

  it('when library:categories:delete is called, should hand the path to the service', async () => {
    const deleteCategory = jest.fn().mockResolvedValue({ deleted: true });
    const ipc = setup({ deleteCategory });

    await expect(
      ipc.invoke(IpcChannels.library.deleteCategory, { path: ['Redes'] }),
    ).resolves.toEqual({ ok: true, data: { deleted: true } });
    expect(deleteCategory).toHaveBeenCalledWith(['Redes']);
  });

  it.each([
    [IpcChannels.library.createCategory, 'createCategory'],
    [IpcChannels.library.deleteCategory, 'deleteCategory'],
  ] as const)(
    'when %s has a path that is not a list, should answer VALIDATION without calling the service',
    async (channel, method) => {
      const fake = jest.fn();
      const ipc = setup({ [method]: fake });

      await expect(ipc.invoke(channel, { path: 'Redes' } as never)).resolves.toMatchObject({
        ok: false,
        error: { code: 'VALIDATION' },
      });
      await expect(ipc.invoke(channel, {} as never)).resolves.toMatchObject({
        ok: false,
        error: { code: 'VALIDATION' },
      });
      expect(fake).not.toHaveBeenCalled();
    },
  );

  it('when the service refuses (category already exists, has pages...), should answer VALIDATION with its message', async () => {
    const ipc = setup({
      createCategory: jest
        .fn()
        .mockRejectedValue(new HttpLikeError('Já existe uma categoria com esse caminho.', 400)),
    });

    await expect(
      ipc.invoke(IpcChannels.library.createCategory, { path: ['Redes'] }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'Já existe uma categoria com esse caminho.' },
    });
  });

  it('when deleting a category that does not exist, should answer NOT_FOUND', async () => {
    const ipc = setup({
      deleteCategory: jest
        .fn()
        .mockRejectedValue(new HttpLikeError('Categoria não encontrada.', 404)),
    });

    await expect(
      ipc.invoke(IpcChannels.library.deleteCategory, { path: ['X'] }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
