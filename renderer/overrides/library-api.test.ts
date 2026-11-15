import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('#lib/api', () => ({ api: vi.fn().mockResolvedValue({}) }));

import { api } from '#lib/api';

import { IpcChannels } from '../../src/shared/channels';
import { failure, mockApi, ok } from '../settings/src/testing';

import {
  archiveDocument,
  createArticle,
  discardDocument,
  getCategories,
  getDocument,
  getDocuments,
  getInbox,
  getIndexStatus,
  getTags,
  publishDocument,
  reindex,
  suggestClassification,
  toListFilters,
  updateDocument,
} from './library-api';

describe('toListFilters', () => {
  it('when there are no filters, should answer an empty payload', () => {
    expect(toListFilters()).toEqual({});
    expect(toListFilters({})).toEqual({});
  });

  it('when text has spaces around, should send it trimmed; blank text is omitted', () => {
    expect(toListFilters({ q: '  devops  ' })).toEqual({ q: 'devops' });
    expect(toListFilters({ q: '   ' })).toEqual({});
  });

  it('when category and tags are empty lists, should omit them', () => {
    expect(toListFilters({ category: [], tags: [] })).toEqual({});
  });

  it('when every filter is set, should keep category and tags in order and pass the rest', () => {
    expect(
      toListFilters({
        q: 'x',
        category: ['Ciência da Computação', 'DevOps'],
        tags: ['a', 'b'],
        type: 'summary',
        source: 'video',
        status: 'archived',
        sort: 'recent',
      }),
    ).toEqual({
      q: 'x',
      category: ['Ciência da Computação', 'DevOps'],
      tags: ['a', 'b'],
      type: 'summary',
      source: 'video',
      status: 'archived',
      sort: 'recent',
    });
  });
});

describe('library api: leitura por IPC (cópia do desktop)', () => {
  beforeEach(() => {
    vi.mocked(api).mockClear();
  });

  it('when listing documents, should send the filters to library:documents:list and not use HTTP', async () => {
    const docs = [{ id: '1' }];
    const invoke = mockApi({ [IpcChannels.library.documents.list]: () => ok(docs) });

    await expect(getDocuments({ q: ' oi ', tags: ['t'] })).resolves.toEqual(docs);

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.list, {
      q: 'oi',
      tags: ['t'],
    });
    expect(api).not.toHaveBeenCalled();
  });

  it('when listing without filters, should still send an object payload', async () => {
    const invoke = mockApi({ [IpcChannels.library.documents.list]: () => ok([]) });

    await getDocuments();

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.list, {});
  });

  it('when getting a document, should send its id as it is (no URL encoding)', async () => {
    const invoke = mockApi({
      [IpcChannels.library.documents.get]: () => ok({ meta: {}, content: 'c' }),
    });

    await getDocument('a b/ç');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.get, { id: 'a b/ç' });
  });

  it('when the document does not exist, should reject with the NOT_FOUND message', async () => {
    mockApi({
      [IpcChannels.library.documents.get]: () =>
        failure('NOT_FOUND', 'Documento "x" não encontrado.'),
    });

    await expect(getDocument('x')).rejects.toThrow('Documento "x" não encontrado.');
  });

  it('when reading inbox, categories, tags and index, should call each channel', async () => {
    const invoke = mockApi({
      [IpcChannels.library.inbox]: () => ok([{ id: 'p' }]),
      [IpcChannels.library.categories]: () => ok([{ name: 'A' }]),
      [IpcChannels.library.tags]: () => ok([{ tag: 't', count: 1 }]),
      [IpcChannels.library.index]: () => ok({ total: 3, errors: [] }),
    });

    await expect(getInbox()).resolves.toEqual([{ id: 'p' }]);
    await expect(getCategories()).resolves.toEqual([{ name: 'A' }]);
    await expect(getTags()).resolves.toEqual([{ tag: 't', count: 1 }]);
    await expect(getIndexStatus()).resolves.toEqual({ total: 3, errors: [] });

    expect(invoke).toHaveBeenCalledTimes(4);
    expect(api).not.toHaveBeenCalled();
  });
});

describe('library api: escrita segue por HTTP até a 06b (cópia do desktop)', () => {
  beforeEach(() => {
    vi.mocked(api).mockClear();
  });

  it('when reindexing, should POST /library/reindex', async () => {
    await reindex();

    expect(api).toHaveBeenCalledWith('/library/reindex', { method: 'POST' });
  });

  it('when publishing, should POST the body to the document publish route', async () => {
    await publishDocument('a b', { category: ['X'], tags: ['t'] });

    expect(api).toHaveBeenCalledWith('/library/documents/a%20b/publish', {
      method: 'POST',
      body: JSON.stringify({ category: ['X'], tags: ['t'] }),
    });
  });

  it('when archiving and discarding, should use POST archive and DELETE', async () => {
    await archiveDocument('1');
    await discardDocument('1');

    expect(api).toHaveBeenCalledWith('/library/documents/1/archive', { method: 'POST' });
    expect(api).toHaveBeenCalledWith('/library/documents/1', { method: 'DELETE' });
  });

  it('when creating, suggesting and updating, should keep the HTTP routes and bodies', async () => {
    await createArticle({ title: 'T', category: ['C'], content: 'x' });
    await suggestClassification('1');
    await suggestClassification('1', 'm');
    await updateDocument('1', { title: 'N' });

    expect(api).toHaveBeenCalledWith('/library/documents/article', {
      method: 'POST',
      body: JSON.stringify({ title: 'T', category: ['C'], content: 'x' }),
    });
    expect(api).toHaveBeenCalledWith('/library/documents/1/suggest', {
      method: 'POST',
      body: '{}',
    });
    expect(api).toHaveBeenCalledWith('/library/documents/1/suggest', {
      method: 'POST',
      body: JSON.stringify({ modelId: 'm' }),
    });
    expect(api).toHaveBeenCalledWith('/library/documents/1', {
      method: 'PATCH',
      body: JSON.stringify({ title: 'N' }),
    });
  });
});
