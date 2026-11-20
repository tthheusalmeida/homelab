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

function setup(renameCategory: jest.Mock) {
  const library = { renameCategory } as unknown as LibraryReader & LibraryWriter;
  const ipc = new FakeIpcMain();

  new IpcRegistrar(ipc).register([new LibraryHandler(library, { suggest: jest.fn() })]);

  return { ipc, renameCategory };
}

describe('LibraryHandler: renomear categoria', () => {
  it('when library:categories:rename is called, should hand both paths to the service and answer how many moved', async () => {
    const { ipc, renameCategory } = setup(jest.fn().mockResolvedValue({ moved: 3 }));

    await expect(
      ipc.invoke(IpcChannels.library.renameCategory, {
        from: ['Tecnologia', 'IA'],
        to: ['Ciência', 'IA'],
      }),
    ).resolves.toEqual({ ok: true, data: { moved: 3 } });
    expect(renameCategory).toHaveBeenCalledWith(['Tecnologia', 'IA'], ['Ciência', 'IA']);
  });

  it.each([
    ['from that is not a list', { from: 'Tecnologia', to: ['A'] }],
    ['to that is not a list', { from: ['A'], to: 'B' }],
    ['no paths', {}],
  ])(
    'when the payload has %s, should answer VALIDATION without calling the service',
    async (_name, payload) => {
      const { ipc, renameCategory } = setup(jest.fn());

      await expect(
        ipc.invoke(IpcChannels.library.renameCategory, payload as never),
      ).resolves.toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
      expect(renameCategory).not.toHaveBeenCalled();
    },
  );

  it('when the category does not exist, should answer NOT_FOUND', async () => {
    const { ipc } = setup(
      jest.fn().mockRejectedValue(new HttpLikeError('Categoria não encontrada.', 404)),
    );

    await expect(
      ipc.invoke(IpcChannels.library.renameCategory, { from: ['X'], to: ['Y'] }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
