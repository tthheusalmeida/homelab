import { IpcChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { LibraryHandler, type LibraryReader } from './library.handler';

/** Exceções do Nest (duck typing: o mapper só olha `getStatus`). */
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

type Fakes = { [K in keyof LibraryReader]: jest.Mock };

function setup(overrides: Partial<Fakes> = {}) {
  const library: Fakes = {
    list: jest.fn().mockResolvedValue([]),
    inbox: jest.fn().mockReturnValue([]),
    get: jest.fn().mockResolvedValue({ meta: {}, content: '' }),
    categories: jest.fn().mockReturnValue([]),
    tags: jest.fn().mockReturnValue([]),
    indexStatus: jest.fn().mockReturnValue({ total: 0, errors: [] }),
    ...overrides,
  };
  const ipc = new FakeIpcMain();
  new IpcRegistrar(ipc).register([new LibraryHandler(library)]);

  return { ipc, library };
}

describe('LibraryHandler', () => {
  it('when library:documents:list is called, should pass every filter untouched to the service', async () => {
    const docs = [{ id: '1', title: 'Doc' }];
    const { ipc, library } = setup({ list: jest.fn().mockResolvedValue(docs) });
    const filters = {
      q: 'devops',
      category: ['Ciência da Computação', 'DevOps'],
      type: 'summary' as const,
      source: 'video' as const,
      tags: ['a', 'b'],
      status: 'archived' as const,
      sort: 'recent' as const,
    };

    await expect(ipc.invoke(IpcChannels.library.documents.list, filters)).resolves.toEqual({
      ok: true,
      data: docs,
    });
    expect(library.list).toHaveBeenCalledWith(filters);
  });

  it('when library:documents:list is called with an empty payload, should list with no filters', async () => {
    const { ipc, library } = setup();

    await ipc.invoke(IpcChannels.library.documents.list, {});

    expect(library.list).toHaveBeenCalledWith({});
  });

  it('when a filter value is invalid, should answer VALIDATION with the service message', async () => {
    const { ipc } = setup({
      list: jest.fn().mockRejectedValue(new HttpLikeError('Tipo inválido: x.', 400)),
    });

    await expect(
      ipc.invoke(IpcChannels.library.documents.list, { type: 'x' as 'summary' }),
    ).resolves.toEqual({ ok: false, error: { code: 'VALIDATION', message: 'Tipo inválido: x.' } });
  });

  it('when library:documents:get is called, should read the document by id', async () => {
    const detail = { meta: { id: 'abc' }, content: '# Oi' };
    const { ipc, library } = setup({ get: jest.fn().mockResolvedValue(detail) });

    await expect(ipc.invoke(IpcChannels.library.documents.get, { id: 'abc' })).resolves.toEqual({
      ok: true,
      data: detail,
    });
    expect(library.get).toHaveBeenCalledWith('abc');
  });

  it('when the document does not exist, should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      get: jest.fn().mockRejectedValue(new HttpLikeError('Documento "x" não encontrado.', 404)),
    });

    await expect(ipc.invoke(IpcChannels.library.documents.get, { id: 'x' })).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Documento "x" não encontrado.' },
    });
  });

  it('when inbox, categories, tags and index are called, should answer what the service returns', async () => {
    const { ipc } = setup({
      inbox: jest.fn().mockReturnValue([{ id: 'p' }]),
      categories: jest.fn().mockReturnValue([{ name: 'A' }]),
      tags: jest.fn().mockReturnValue([{ tag: 't', count: 2 }]),
      indexStatus: jest.fn().mockReturnValue({ total: 7, errors: [{ file: 'f', message: 'm' }] }),
    });

    await expect(ipc.invoke(IpcChannels.library.inbox)).resolves.toEqual({
      ok: true,
      data: [{ id: 'p' }],
    });
    await expect(ipc.invoke(IpcChannels.library.categories)).resolves.toEqual({
      ok: true,
      data: [{ name: 'A' }],
    });
    await expect(ipc.invoke(IpcChannels.library.tags)).resolves.toEqual({
      ok: true,
      data: [{ tag: 't', count: 2 }],
    });
    await expect(ipc.invoke(IpcChannels.library.index)).resolves.toEqual({
      ok: true,
      data: { total: 7, errors: [{ file: 'f', message: 'm' }] },
    });
  });

  it('when a service throws something unexpected, should answer INTERNAL instead of rejecting', async () => {
    const { ipc } = setup({
      inbox: jest.fn(() => {
        throw new Error('disco indisponível');
      }),
    });

    await expect(ipc.invoke(IpcChannels.library.inbox)).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'disco indisponível' },
    });
  });
});
