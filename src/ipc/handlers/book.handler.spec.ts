import { IpcChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { BookHandler, type BookReader } from './book.handler';

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

type Fakes = { [K in keyof BookReader]: jest.Mock };

function setup(overrides: Partial<Fakes> = {}) {
  const books: Fakes = {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue({ id: 'b1', modules: [] }),
    read: jest.fn().mockResolvedValue({ book: { id: 'b1' }, modules: [] }),
    search: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
  const ipc = new FakeIpcMain();
  new IpcRegistrar(ipc).register([new BookHandler(books)]);

  return { ipc, books };
}

const notFound = (id: string) => new HttpLikeError(`Livro "${id}" não encontrado.`, 404);

describe('BookHandler', () => {
  it('when library:books:list is called without a document, should list every book', async () => {
    const summaries = [{ id: 'b1', title: 'Livro' }];
    const { ipc, books } = setup({ list: jest.fn().mockResolvedValue(summaries) });

    await expect(ipc.invoke(IpcChannels.library.books.list, {})).resolves.toEqual({
      ok: true,
      data: summaries,
    });
    expect(books.list).toHaveBeenCalledWith(undefined);
  });

  it('when library:books:list is called with a document id, should pass it to mark the books that contain it', async () => {
    const { ipc, books } = setup();

    await ipc.invoke(IpcChannels.library.books.list, { documentId: 'doc-1' });

    expect(books.list).toHaveBeenCalledWith('doc-1');
  });

  it('when library:books:get is called, should answer the book detail', async () => {
    const detail = { id: 'b1', title: 'Livro', modules: [{ id: 'm1', title: 'M', chapters: [] }] };
    const { ipc, books } = setup({ get: jest.fn().mockResolvedValue(detail) });

    await expect(ipc.invoke(IpcChannels.library.books.get, { id: 'b1' })).resolves.toEqual({
      ok: true,
      data: detail,
    });
    expect(books.get).toHaveBeenCalledWith('b1');
  });

  it('when the book does not exist, should answer NOT_FOUND for get, read and search', async () => {
    const { ipc } = setup({
      get: jest.fn().mockRejectedValue(notFound('x')),
      read: jest.fn().mockRejectedValue(notFound('x')),
      search: jest.fn().mockRejectedValue(notFound('x')),
    });
    const expected = {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Livro "x" não encontrado.' },
    };

    await expect(ipc.invoke(IpcChannels.library.books.get, { id: 'x' })).resolves.toEqual(expected);
    await expect(ipc.invoke(IpcChannels.library.books.read, { id: 'x' })).resolves.toEqual(
      expected,
    );
    await expect(
      ipc.invoke(IpcChannels.library.books.search, { id: 'x', q: 'a' }),
    ).resolves.toEqual(expected);
  });

  it('when library:books:read is called, should answer the book with its chapter contents', async () => {
    const reading = {
      book: { id: 'b1' },
      modules: [{ id: 'm1', title: 'M', chapters: [{ documentId: 'd1', content: '# Cap' }] }],
    };
    const { ipc, books } = setup({ read: jest.fn().mockResolvedValue(reading) });

    await expect(ipc.invoke(IpcChannels.library.books.read, { id: 'b1' })).resolves.toEqual({
      ok: true,
      data: reading,
    });
    expect(books.read).toHaveBeenCalledWith('b1');
  });

  it('when library:books:search is called, should pass the id and the term and answer the hits', async () => {
    const hits = [{ documentId: 'd1', chapterTitle: 'Cap', line: 3, snippet: '...termo...' }];
    const { ipc, books } = setup({ search: jest.fn().mockResolvedValue(hits) });

    await expect(
      ipc.invoke(IpcChannels.library.books.search, { id: 'b1', q: 'termo' }),
    ).resolves.toEqual({ ok: true, data: hits });
    expect(books.search).toHaveBeenCalledWith('b1', 'termo');
  });

  it('when the search term is empty, should still call the service (it answers an empty list)', async () => {
    const { ipc, books } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.books.search, { id: 'b1', q: '' }),
    ).resolves.toEqual({ ok: true, data: [] });
    expect(books.search).toHaveBeenCalledWith('b1', '');
  });

  it('when the term is missing from the payload, should search with an empty term like the controller did', async () => {
    const { ipc, books } = setup();

    await ipc.invoke(IpcChannels.library.books.search, { id: 'b1' });

    expect(books.search).toHaveBeenCalledWith('b1', '');
  });

  it('when the service throws something unexpected, should answer INTERNAL instead of rejecting', async () => {
    const { ipc } = setup({ list: jest.fn().mockRejectedValue(new Error('pasta ilegível')) });

    await expect(ipc.invoke(IpcChannels.library.books.list, {})).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'pasta ilegível' },
    });
  });
});
