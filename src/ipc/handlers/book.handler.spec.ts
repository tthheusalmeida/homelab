import { IpcChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { BookHandler, type BookReader, type BookWriter } from './book.handler';

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

type Fakes = { [K in keyof (BookReader & BookWriter)]: jest.Mock };

const detail = { id: 'b1', title: 'Livro', modules: [] };

function setup(overrides: Partial<Fakes> = {}) {
  const books: Fakes = {
    list: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(detail),
    read: jest.fn().mockResolvedValue({ book: { id: 'b1' }, modules: [] }),
    create: jest.fn().mockResolvedValue(detail),
    update: jest.fn().mockResolvedValue(detail),
    remove: jest.fn().mockResolvedValue(undefined),
    setStructure: jest.fn().mockResolvedValue(detail),
    addChapter: jest.fn().mockResolvedValue(detail),
    setChapterRead: jest.fn().mockResolvedValue(detail),
    resetProgress: jest.fn().mockResolvedValue(detail),
    saveLastPosition: jest.fn().mockResolvedValue(detail),
    ...overrides,
  };
  const ipc = new FakeIpcMain();
  new IpcRegistrar(ipc).register([new BookHandler(books)]);

  return { ipc, books };
}

const notFound = (message = 'Livro não encontrado.') => new HttpLikeError(message, 404);
const invalid = (message: string) => new HttpLikeError(message, 400);

describe('BookHandler: leitura', () => {
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
    const { ipc, books } = setup();

    await expect(ipc.invoke(IpcChannels.library.books.get, { id: 'b1' })).resolves.toEqual({
      ok: true,
      data: detail,
    });
    expect(books.get).toHaveBeenCalledWith('b1');
  });

  it('when the book does not exist, should answer NOT_FOUND for get and read', async () => {
    const { ipc } = setup({
      get: jest.fn().mockRejectedValue(notFound()),
      read: jest.fn().mockRejectedValue(notFound()),
    });
    const expected = {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Livro não encontrado.' },
    };

    await expect(ipc.invoke(IpcChannels.library.books.get, { id: 'x' })).resolves.toEqual(expected);
    await expect(ipc.invoke(IpcChannels.library.books.read, { id: 'x' })).resolves.toEqual(
      expected,
    );
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

  it('when the service throws something unexpected, should answer INTERNAL instead of rejecting', async () => {
    const { ipc } = setup({ list: jest.fn().mockRejectedValue(new Error('pasta ilegível')) });

    await expect(ipc.invoke(IpcChannels.library.books.list, {})).resolves.toEqual({
      ok: false,
      error: { code: 'INTERNAL', message: 'pasta ilegível' },
    });
  });
});

describe('BookHandler: criar, editar e apagar', () => {
  it('when creating, should pass the whole input to the service and answer the book', async () => {
    const { ipc, books } = setup();
    const input = {
      title: 'Pós em DevOps',
      kind: 'pos' as const,
      description: 'Resumos',
      subtitle: 'Aulas',
      coverColor: 'violet' as const,
      coverImageUrl: 'https://exemplo.com/capa.jpg',
    };

    await expect(ipc.invoke(IpcChannels.library.books.create, input)).resolves.toEqual({
      ok: true,
      data: detail,
    });
    expect(books.create).toHaveBeenCalledWith(input);
  });

  it('when the title is empty or the kind is invalid, should answer VALIDATION with the service message', async () => {
    const { ipc } = setup({
      create: jest
        .fn()
        .mockRejectedValueOnce(invalid('O título do livro é obrigatório.'))
        .mockRejectedValueOnce(invalid('Tipo de livro inválido.')),
    });

    await expect(ipc.invoke(IpcChannels.library.books.create, { title: ' ' })).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'O título do livro é obrigatório.' },
    });
    await expect(
      ipc.invoke(IpcChannels.library.books.create, { title: 'x', kind: 'zzz' as 'book' }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'Tipo de livro inválido.' },
    });
  });

  it('when updating, should pass the id apart from the fields given', async () => {
    const { ipc, books } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.books.update, { id: 'b1', title: 'Novo', coverColor: 'rose' }),
    ).resolves.toEqual({ ok: true, data: detail });
    expect(books.update).toHaveBeenCalledWith('b1', { title: 'Novo', coverColor: 'rose' });
  });

  it('when updating an unknown book, should answer NOT_FOUND', async () => {
    const { ipc } = setup({ update: jest.fn().mockRejectedValue(notFound()) });

    await expect(
      ipc.invoke(IpcChannels.library.books.update, { id: 'x', title: 'a' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('when deleting, should remove by id and answer ok with no data', async () => {
    const { ipc, books } = setup();

    await expect(ipc.invoke(IpcChannels.library.books.delete, { id: 'b1' })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(books.remove).toHaveBeenCalledWith('b1');
  });

  it('when deleting an unknown book, should answer NOT_FOUND', async () => {
    const { ipc } = setup({ remove: jest.fn().mockRejectedValue(notFound()) });

    await expect(ipc.invoke(IpcChannels.library.books.delete, { id: 'x' })).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Livro não encontrado.' },
    });
  });
});

describe('BookHandler: estrutura e capítulos', () => {
  it('when setting the structure, should pass the id and the modules in order', async () => {
    const { ipc, books } = setup();
    const modules = [
      { id: 'm1', title: 'Módulo 1', documentIds: ['d1', 'd2'] },
      { title: '', documentIds: ['d3'] },
    ];

    await expect(
      ipc.invoke(IpcChannels.library.books.setStructure, { id: 'b1', modules }),
    ).resolves.toEqual({ ok: true, data: detail });
    expect(books.setStructure).toHaveBeenCalledWith('b1', modules);
  });

  it('when modules is not a list, should answer VALIDATION and not call the service', async () => {
    const { ipc, books } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.books.setStructure, {
        id: 'b1',
        modules: 'm1' as unknown as [],
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'O campo "modules" deve ser uma lista.' },
    });
    expect(books.setStructure).not.toHaveBeenCalled();
  });

  it('when modules is missing, should answer VALIDATION as well', async () => {
    const { ipc } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.books.setStructure, { id: 'b1' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  });

  it('when a document in the structure is not published, should answer VALIDATION with the service message', async () => {
    const message = 'O documento d9 não está na biblioteca.';
    const { ipc } = setup({ setStructure: jest.fn().mockRejectedValue(invalid(message)) });

    await expect(
      ipc.invoke(IpcChannels.library.books.setStructure, {
        id: 'b1',
        modules: [{ documentIds: ['d9'] }],
      }),
    ).resolves.toEqual({ ok: false, error: { code: 'VALIDATION', message } });
  });

  it('when setting the structure of an unknown book, should answer NOT_FOUND', async () => {
    const { ipc } = setup({ setStructure: jest.fn().mockRejectedValue(notFound()) });

    await expect(
      ipc.invoke(IpcChannels.library.books.setStructure, { id: 'x', modules: [] }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('when adding a chapter, should pass the document and the module (or none)', async () => {
    const { ipc, books } = setup();

    await ipc.invoke(IpcChannels.library.books.addChapter, { id: 'b1', documentId: 'd1' });
    await ipc.invoke(IpcChannels.library.books.addChapter, {
      id: 'b1',
      documentId: 'd2',
      moduleId: 'm1',
    });

    expect(books.addChapter).toHaveBeenNthCalledWith(1, 'b1', 'd1', undefined);
    expect(books.addChapter).toHaveBeenNthCalledWith(2, 'b1', 'd2', 'm1');
  });

  it('when the chapter is already in the book or the module does not exist, should answer VALIDATION', async () => {
    const { ipc } = setup({
      addChapter: jest
        .fn()
        .mockRejectedValueOnce(invalid('O documento já está neste livro.'))
        .mockRejectedValueOnce(invalid('Módulo não encontrado neste livro.')),
    });

    await expect(
      ipc.invoke(IpcChannels.library.books.addChapter, { id: 'b1', documentId: 'd1' }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'O documento já está neste livro.' },
    });
    await expect(
      ipc.invoke(IpcChannels.library.books.addChapter, {
        id: 'b1',
        documentId: 'd1',
        moduleId: 'zz',
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'Módulo não encontrado neste livro.' },
    });
  });

  it('when adding a chapter to an unknown book, should answer NOT_FOUND', async () => {
    const { ipc } = setup({ addChapter: jest.fn().mockRejectedValue(notFound()) });

    await expect(
      ipc.invoke(IpcChannels.library.books.addChapter, { id: 'x', documentId: 'd' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});

describe('BookHandler: progresso', () => {
  it('when marking a chapter as read and unread, should pass the flag as it is', async () => {
    const { ipc, books } = setup();

    await ipc.invoke(IpcChannels.library.books.markChapterRead, {
      id: 'b1',
      documentId: 'd1',
      read: true,
    });
    await ipc.invoke(IpcChannels.library.books.markChapterRead, {
      id: 'b1',
      documentId: 'd1',
      read: false,
    });

    expect(books.setChapterRead).toHaveBeenNthCalledWith(1, 'b1', 'd1', true);
    expect(books.setChapterRead).toHaveBeenNthCalledWith(2, 'b1', 'd1', false);
  });

  it('when the chapter is not in the book, should answer NOT_FOUND with the service message', async () => {
    const message = 'Capítulo não encontrado neste livro.';
    const { ipc } = setup({ setChapterRead: jest.fn().mockRejectedValue(notFound(message)) });

    await expect(
      ipc.invoke(IpcChannels.library.books.markChapterRead, {
        id: 'b1',
        documentId: 'zz',
        read: true,
      }),
    ).resolves.toEqual({ ok: false, error: { code: 'NOT_FOUND', message } });
  });

  it('when the read flag is invalid, should answer VALIDATION with the service message', async () => {
    const { ipc } = setup({
      setChapterRead: jest
        .fn()
        .mockRejectedValue(invalid('O campo "read" deve ser verdadeiro ou falso.')),
    });

    await expect(
      ipc.invoke(IpcChannels.library.books.markChapterRead, {
        id: 'b1',
        documentId: 'd1',
        read: 'sim' as unknown as boolean,
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
  });

  it('when resetting the progress, should reset by id and answer the book', async () => {
    const { ipc, books } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.books.resetProgress, { id: 'b1' }),
    ).resolves.toEqual({ ok: true, data: detail });
    expect(books.resetProgress).toHaveBeenCalledWith('b1');
  });

  it('when resetting an unknown book, should answer NOT_FOUND', async () => {
    const { ipc } = setup({ resetProgress: jest.fn().mockRejectedValue(notFound()) });

    await expect(
      ipc.invoke(IpcChannels.library.books.resetProgress, { id: 'x' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('when saving the position, should pass only documentId and elementId to the service', async () => {
    const { ipc, books } = setup();

    await ipc.invoke(IpcChannels.library.books.setPosition, {
      id: 'b1',
      documentId: 'd1',
      elementId: 'integracao-continua',
    });

    expect(books.saveLastPosition).toHaveBeenCalledWith('b1', {
      documentId: 'd1',
      elementId: 'integracao-continua',
    });
  });

  it('when saving the position of a chapter that is not in the book, should answer the service error', async () => {
    const { ipc } = setup({
      saveLastPosition: jest
        .fn()
        .mockRejectedValue(invalid('Posição inválida: o capítulo não está no livro.')),
    });

    await expect(
      ipc.invoke(IpcChannels.library.books.setPosition, {
        id: 'b1',
        documentId: 'zz',
        elementId: 'x',
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'Posição inválida: o capítulo não está no livro.' },
    });
  });
});
