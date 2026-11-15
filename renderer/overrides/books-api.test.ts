import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/api', () => ({ api: vi.fn().mockResolvedValue({}) }));

import { api } from '#lib/api';

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

describe('books api: leitura por IPC (cópia do desktop)', () => {
  beforeEach(() => {
    vi.mocked(api).mockClear();
  });

  it('when listing without a document, should send an empty payload and not use HTTP', async () => {
    const books = [{ id: 'b1' }];
    const invoke = mockApi({ [IpcChannels.library.books.list]: () => ok(books) });

    await expect(getBooks()).resolves.toEqual(books);

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.books.list, {});
    expect(api).not.toHaveBeenCalled();
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
    expect(api).not.toHaveBeenCalled();
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
      [IpcChannels.library.books.get]: () => failure('NOT_FOUND', 'Livro "x" não encontrado.'),
    });

    await expect(getBook('x')).rejects.toThrow('Livro "x" não encontrado.');
  });
});

describe('books api: escrita segue por HTTP até a 07b (cópia do desktop)', () => {
  beforeEach(() => {
    vi.mocked(api).mockClear();
  });

  it('when creating and updating, should POST and PATCH the body', async () => {
    await createBook({ title: 'L' });
    await updateBook('a b', { title: 'N' });

    expect(api).toHaveBeenCalledWith('/library/books', {
      method: 'POST',
      body: JSON.stringify({ title: 'L' }),
    });
    expect(api).toHaveBeenCalledWith('/library/books/a%20b', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'N' }),
    });
  });

  it('when deleting, should DELETE the book', async () => {
    await deleteBook('1');

    expect(api).toHaveBeenCalledWith('/library/books/1', { method: 'DELETE' });
  });

  it('when saving the structure, should PUT the modules', async () => {
    const modules = [{ id: 'm', title: 'M', documentIds: ['d'] }];

    await setBookStructure('1', modules);

    expect(api).toHaveBeenCalledWith('/library/books/1/structure', {
      method: 'PUT',
      body: JSON.stringify({ modules }),
    });
  });

  it('when adding a chapter, should send the module only when given', async () => {
    await addBookChapter('1', 'd');
    await addBookChapter('1', 'd', 'm');

    expect(api).toHaveBeenCalledWith('/library/books/1/chapters', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'd' }),
    });
    expect(api).toHaveBeenCalledWith('/library/books/1/chapters', {
      method: 'POST',
      body: JSON.stringify({ documentId: 'd', moduleId: 'm' }),
    });
  });

  it('when marking a chapter, resetting progress and saving the position, should keep the HTTP routes', async () => {
    await setChapterRead('1', 'd 2', true);
    await resetBookProgress('1');
    await saveBookPosition('1', { documentId: 'd', elementId: 'e' });

    expect(api).toHaveBeenCalledWith('/library/books/1/chapters/d%202/read', {
      method: 'PUT',
      body: JSON.stringify({ read: true }),
    });
    expect(api).toHaveBeenCalledWith('/library/books/1/progress', { method: 'DELETE' });
    expect(api).toHaveBeenCalledWith('/library/books/1/position', {
      method: 'PUT',
      body: JSON.stringify({ documentId: 'd', elementId: 'e' }),
    });
  });
});
