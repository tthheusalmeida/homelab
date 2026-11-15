import { describe, expect, it } from 'vitest';

import { IpcChannels } from '../../src/shared/channels';
import { failure, mockApi, ok } from '../settings/src/testing';

import {
  addBookChapter,
  createBook,
  deleteBook,
  getBook,
  getBooks,
  readBook,
  resetBookProgress,
  saveBookPosition,
  searchBook,
  setBookStructure,
  setChapterRead,
  updateBook,
} from './books-api';

const detail = { id: 'b1', title: 'Livro', modules: [] };

describe('books api: leitura por IPC (cópia do desktop)', () => {
  it('when listing without a document, should send an empty payload', async () => {
    const books = [{ id: 'b1' }];
    const invoke = mockApi({ [IpcChannels.library.books.list]: () => ok(books) });

    await expect(getBooks()).resolves.toEqual(books);

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.list, {});
  });

  it('when listing for a document, should send its id as documentId', async () => {
    const invoke = mockApi({ [IpcChannels.library.books.list]: () => ok([]) });

    await getBooks('doc 1/ç');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.list, { documentId: 'doc 1/ç' });
  });

  it('when the document id is an empty string, should list without it like the old query did', async () => {
    const invoke = mockApi({ [IpcChannels.library.books.list]: () => ok([]) });

    await getBooks('');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.list, {});
  });

  it('when getting and reading a book, should send the id as it is (no URL encoding)', async () => {
    const invoke = mockApi({
      [IpcChannels.library.books.get]: () => ok({ id: 'a b' }),
      [IpcChannels.library.books.read]: () => ok({ book: {}, modules: [] }),
    });

    await getBook('a b');
    await readBook('a b');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.get, { id: 'a b' });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.read, { id: 'a b' });
  });

  it('when searching, should send the id and the term untouched (even if empty)', async () => {
    const hits = [{ documentId: 'd1', line: 2 }];
    const invoke = mockApi({ [IpcChannels.library.books.search]: () => ok(hits) });

    await expect(searchBook('b1', 'café & chá')).resolves.toEqual(hits);
    await searchBook('b1', '');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.search, {
      id: 'b1',
      q: 'café & chá',
    });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.search, { id: 'b1', q: '' });
  });

  it('when the book does not exist, should reject with the NOT_FOUND message', async () => {
    mockApi({
      [IpcChannels.library.books.get]: () => failure('NOT_FOUND', 'Livro não encontrado.'),
    });

    await expect(getBook('x')).rejects.toThrow('Livro não encontrado.');
  });
});

describe('books api: escrita por IPC (cópia do desktop)', () => {
  it('when creating, should send the input as the payload', async () => {
    const invoke = mockApi({ [IpcChannels.library.books.create]: () => ok(detail) });
    const input = { title: 'L', kind: 'pos' as const, coverColor: 'rose' as const };

    await expect(createBook(input)).resolves.toEqual(detail);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.create, input);
  });

  it('when the title is empty, should reject with the VALIDATION message', async () => {
    mockApi({
      [IpcChannels.library.books.create]: () =>
        failure('VALIDATION', 'O título do livro é obrigatório.'),
    });

    await expect(createBook({ title: ' ' })).rejects.toThrow('O título do livro é obrigatório.');
  });

  it('when updating, should send the id together with the changed fields', async () => {
    const invoke = mockApi({ [IpcChannels.library.books.update]: () => ok(detail) });

    await updateBook('a b', { title: 'N' });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.update, {
      id: 'a b',
      title: 'N',
    });
  });

  it('when deleting, should send the id and resolve with nothing', async () => {
    const invoke = mockApi({ [IpcChannels.library.books.delete]: () => ok(undefined) });

    await expect(deleteBook('1')).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.delete, { id: '1' });
  });

  it('when saving the structure, should send the id and the modules', async () => {
    const invoke = mockApi({ [IpcChannels.library.books.setStructure]: () => ok(detail) });
    const modules = [{ id: 'm', title: 'M', documentIds: ['d'] }];

    await setBookStructure('1', modules);

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.setStructure, {
      id: '1',
      modules,
    });
  });

  it('when adding a chapter, should send the module only when given', async () => {
    const invoke = mockApi({ [IpcChannels.library.books.addChapter]: () => ok(detail) });

    await addBookChapter('1', 'd');
    await addBookChapter('1', 'd', 'm');

    expect(invoke).toHaveBeenNthCalledWith(1, IpcChannels.library.books.addChapter, {
      id: '1',
      documentId: 'd',
    });
    expect(invoke).toHaveBeenNthCalledWith(2, IpcChannels.library.books.addChapter, {
      id: '1',
      documentId: 'd',
      moduleId: 'm',
    });
  });

  it('when marking a chapter as read, should send the id, the document and the flag', async () => {
    const invoke = mockApi({ [IpcChannels.library.books.markChapterRead]: () => ok(detail) });

    await setChapterRead('1', 'd 2', true);
    await setChapterRead('1', 'd 2', false);

    expect(invoke).toHaveBeenNthCalledWith(1, IpcChannels.library.books.markChapterRead, {
      id: '1',
      documentId: 'd 2',
      read: true,
    });
    expect(invoke).toHaveBeenNthCalledWith(2, IpcChannels.library.books.markChapterRead, {
      id: '1',
      documentId: 'd 2',
      read: false,
    });
  });

  it('when resetting the progress, should send only the id', async () => {
    const invoke = mockApi({ [IpcChannels.library.books.resetProgress]: () => ok(detail) });

    await resetBookProgress('1');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.resetProgress, { id: '1' });
  });

  it('when saving the position, should send the id with the document and the element', async () => {
    const invoke = mockApi({ [IpcChannels.library.books.setPosition]: () => ok(detail) });

    await saveBookPosition('1', { documentId: 'd', elementId: 'e' });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.setPosition, {
      id: '1',
      documentId: 'd',
      elementId: 'e',
    });
  });

  it('when the chapter is not in the book, should reject with the NOT_FOUND message', async () => {
    mockApi({
      [IpcChannels.library.books.markChapterRead]: () =>
        failure('NOT_FOUND', 'Capítulo não encontrado neste livro.'),
    });

    await expect(setChapterRead('1', 'zz', true)).rejects.toThrow(
      'Capítulo não encontrado neste livro.',
    );
  });
});
