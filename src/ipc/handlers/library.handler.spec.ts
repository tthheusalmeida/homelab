import { IpcChannels } from '../../shared/channels';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { LibraryHandler, type LibraryReader, type LibraryWriter } from './library.handler';

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

type Fakes = { [K in keyof (LibraryReader & LibraryWriter)]: jest.Mock };

function setup(overrides: Partial<Fakes> = {}, suggest = jest.fn()) {
  const library: Fakes = {
    list: jest.fn().mockResolvedValue([]),
    inbox: jest.fn().mockReturnValue([]),
    get: jest.fn().mockResolvedValue({ meta: {}, content: '' }),
    categories: jest.fn().mockReturnValue([]),
    tags: jest.fn().mockReturnValue([]),
    indexStatus: jest.fn().mockReturnValue({ total: 0, errors: [] }),
    reindex: jest.fn().mockResolvedValue({ indexed: 0, errors: [] }),
    createArticle: jest.fn().mockResolvedValue({ meta: {}, content: '' }),
    publish: jest.fn().mockResolvedValue({ meta: {}, content: '' }),
    update: jest.fn().mockResolvedValue({ meta: {}, content: '' }),
    archive: jest.fn().mockResolvedValue({ meta: {}, content: '' }),
    discard: jest.fn().mockResolvedValue(undefined),
    renameCategory: jest.fn().mockResolvedValue({ moved: 0 }),
    ...overrides,
  };
  const ipc = new FakeIpcMain();
  new IpcRegistrar(ipc).register([new LibraryHandler(library, { suggest })]);

  return { ipc, library, suggest };
}

describe('LibraryHandler: leitura', () => {
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

describe('LibraryHandler: escrita', () => {
  const detail = { meta: { id: 'abc', title: 'T' }, content: 'c' };

  it('when library:reindex is called, should rebuild the index and answer its result', async () => {
    const result = { indexed: 4, errors: [{ file: 'f.md', message: 'sem frontmatter' }] };
    const { ipc, library } = setup({ reindex: jest.fn().mockResolvedValue(result) });

    await expect(ipc.invoke(IpcChannels.library.reindex)).resolves.toEqual({
      ok: true,
      data: result,
    });
    expect(library.reindex).toHaveBeenCalledTimes(1);
  });

  it('when creating an article, should pass title, category, tags and content to the service', async () => {
    const { ipc, library } = setup({ createArticle: jest.fn().mockResolvedValue(detail) });
    const body = { title: 'T', category: ['Química', 'Ligações'], tags: ['a'], content: '# x' };

    await expect(ipc.invoke(IpcChannels.library.documents.createArticle, body)).resolves.toEqual({
      ok: true,
      data: detail,
    });
    expect(library.createArticle).toHaveBeenCalledWith(body);
  });

  it('when creating an article without tags, should send tags as undefined', async () => {
    const { ipc, library } = setup();

    await ipc.invoke(IpcChannels.library.documents.createArticle, {
      title: 'T',
      category: ['A'],
      content: 'x',
    });

    expect(library.createArticle).toHaveBeenCalledWith({
      title: 'T',
      category: ['A'],
      tags: undefined,
      content: 'x',
    });
  });

  it('when the article category is not a list of texts, should answer VALIDATION with the field name', async () => {
    const { ipc, library } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.documents.createArticle, {
        title: 'T',
        category: 'Química' as unknown as string[],
        content: 'x',
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'O campo "category" deve ser uma lista de textos.' },
    });
    expect(library.createArticle).not.toHaveBeenCalled();
  });

  it('when the article tags have a non-text item, should answer VALIDATION naming tags', async () => {
    const { ipc } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.documents.createArticle, {
        title: 'T',
        category: ['A'],
        tags: ['ok', 3 as unknown as string],
        content: 'x',
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', message: 'O campo "tags" deve ser uma lista de textos.' },
    });
  });

  it('when the service rejects the article, should answer VALIDATION with its message', async () => {
    const { ipc } = setup({
      createArticle: jest.fn().mockRejectedValue(new HttpLikeError('O título é obrigatório.', 400)),
    });

    await expect(
      ipc.invoke(IpcChannels.library.documents.createArticle, {
        title: ' ',
        category: ['A'],
        content: 'x',
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'O título é obrigatório.' },
    });
  });

  it('when publishing, should pass the id apart from the body', async () => {
    const { ipc, library } = setup({ publish: jest.fn().mockResolvedValue(detail) });

    await expect(
      ipc.invoke(IpcChannels.library.documents.publish, {
        id: 'abc',
        title: 'Novo',
        category: ['A', 'B'],
        tags: ['t'],
      }),
    ).resolves.toEqual({ ok: true, data: detail });
    expect(library.publish).toHaveBeenCalledWith('abc', {
      title: 'Novo',
      category: ['A', 'B'],
      tags: ['t'],
    });
  });

  it('when publishing without a category list, should answer VALIDATION and not call the service', async () => {
    const { ipc, library } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.documents.publish, {
        id: 'abc',
        category: undefined as unknown as string[],
      }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'VALIDATION' } });
    expect(library.publish).not.toHaveBeenCalled();
  });

  it('when publishing a document that is already published, should answer VALIDATION', async () => {
    const { ipc } = setup({
      publish: jest
        .fn()
        .mockRejectedValue(new HttpLikeError('O documento já está na biblioteca.', 400)),
    });

    await expect(
      ipc.invoke(IpcChannels.library.documents.publish, { id: 'abc', category: ['A'] }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'O documento já está na biblioteca.' },
    });
  });

  it('when publishing an unknown document, should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      publish: jest.fn().mockRejectedValue(new HttpLikeError('Documento "x" não encontrado.', 404)),
    });

    await expect(
      ipc.invoke(IpcChannels.library.documents.publish, { id: 'x', category: ['A'] }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('when updating, should send only the fields given, keeping the rest undefined', async () => {
    const { ipc, library } = setup({ update: jest.fn().mockResolvedValue(detail) });

    await expect(
      ipc.invoke(IpcChannels.library.documents.update, { id: 'abc', title: 'Outro' }),
    ).resolves.toEqual({ ok: true, data: detail });
    expect(library.update).toHaveBeenCalledWith('abc', {
      title: 'Outro',
      category: undefined,
      tags: undefined,
      content: undefined,
    });
  });

  it('when updating category, tags and content, should pass all of them', async () => {
    const { ipc, library } = setup();

    await ipc.invoke(IpcChannels.library.documents.update, {
      id: 'abc',
      category: ['Química'],
      tags: ['x', 'y'],
      content: '# novo',
    });

    expect(library.update).toHaveBeenCalledWith('abc', {
      title: undefined,
      category: ['Química'],
      tags: ['x', 'y'],
      content: '# novo',
    });
  });

  it('when the update category is not a list of texts, should answer VALIDATION', async () => {
    const { ipc, library } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.documents.update, {
        id: 'abc',
        category: 'x' as unknown as string[],
      }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: 'VALIDATION', message: 'O campo "category" deve ser uma lista de textos.' },
    });
    expect(library.update).not.toHaveBeenCalled();
  });

  it('when the service refuses to edit a document outside the library, should answer VALIDATION', async () => {
    const message = 'Só é possível editar um documento que está na biblioteca.';
    const { ipc } = setup({
      update: jest.fn().mockRejectedValue(new HttpLikeError(message, 400)),
    });

    await expect(
      ipc.invoke(IpcChannels.library.documents.update, { id: 'abc', title: 'x' }),
    ).resolves.toEqual({ ok: false, error: { code: 'VALIDATION', message } });
  });

  it('when archiving, should archive by id and answer the document', async () => {
    const { ipc, library } = setup({ archive: jest.fn().mockResolvedValue(detail) });

    await expect(ipc.invoke(IpcChannels.library.documents.archive, { id: 'abc' })).resolves.toEqual(
      {
        ok: true,
        data: detail,
      },
    );
    expect(library.archive).toHaveBeenCalledWith('abc');
  });

  it('when archiving an unknown document, should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      archive: jest.fn().mockRejectedValue(new HttpLikeError('Documento "x" não encontrado.', 404)),
    });

    await expect(ipc.invoke(IpcChannels.library.documents.archive, { id: 'x' })).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Documento "x" não encontrado.' },
    });
  });

  it('when deleting, should discard by id and answer ok with no data', async () => {
    const { ipc, library } = setup();

    await expect(ipc.invoke(IpcChannels.library.documents.delete, { id: 'abc' })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(library.discard).toHaveBeenCalledWith('abc');
  });

  it('when deleting an unknown document, should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      discard: jest.fn().mockRejectedValue(new HttpLikeError('Documento "x" não encontrado.', 404)),
    });

    await expect(
      ipc.invoke(IpcChannels.library.documents.delete, { id: 'x' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('when deleting a published document, should answer VALIDATION with the service message', async () => {
    const message = 'Remova o documento da biblioteca antes de descartá-lo.';
    const { ipc } = setup({
      discard: jest.fn().mockRejectedValue(new HttpLikeError(message, 400)),
    });

    await expect(ipc.invoke(IpcChannels.library.documents.delete, { id: 'abc' })).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message },
    });
  });
});

describe('LibraryHandler: sugestão com IA', () => {
  const suggestion = { title: 'T', category: ['A'], tags: ['t'], model: 'gemini-x' };

  it('when suggesting, should pass id and model to the classifier and answer the suggestion', async () => {
    const suggest = jest.fn().mockResolvedValue(suggestion);
    const { ipc } = setup({}, suggest);

    await expect(
      ipc.invoke(IpcChannels.library.documents.suggest, { id: 'abc', modelId: 'gemini-x' }),
    ).resolves.toEqual({ ok: true, data: suggestion });
    expect(suggest).toHaveBeenCalledWith('abc', 'gemini-x');
  });

  it('when no model is given, should let the classifier pick the cheapest one', async () => {
    const suggest = jest.fn().mockResolvedValue(suggestion);
    const { ipc } = setup({}, suggest);

    await ipc.invoke(IpcChannels.library.documents.suggest, { id: 'abc' });

    expect(suggest).toHaveBeenCalledWith('abc', undefined);
  });

  it('when the AI fails (HTTP 502 in the back), should answer PROVIDER_FAILED with the same message', async () => {
    const message = 'Não foi possível obter a sugestão da IA. Tente novamente.';
    const { ipc } = setup({}, jest.fn().mockRejectedValue(new HttpLikeError(message, 502)));

    await expect(ipc.invoke(IpcChannels.library.documents.suggest, { id: 'abc' })).resolves.toEqual(
      { ok: false, error: { code: 'PROVIDER_FAILED', message } },
    );
  });

  it('when the AI answers something unusable, should answer PROVIDER_FAILED', async () => {
    const message = 'A IA não retornou uma sugestão válida. Tente novamente.';
    const { ipc } = setup({}, jest.fn().mockRejectedValue(new HttpLikeError(message, 502)));

    await expect(ipc.invoke(IpcChannels.library.documents.suggest, { id: 'abc' })).resolves.toEqual(
      { ok: false, error: { code: 'PROVIDER_FAILED', message } },
    );
  });

  it('when Gemini has no key (hidden as the cause of the 502), should answer NOT_CONFIGURED', async () => {
    const cause = new IpcError(
      IpcErrorCode.NOT_CONFIGURED,
      'Chave da API do Gemini não configurada.',
    );
    const wrapper = Object.assign(
      new Error('Não foi possível obter a sugestão da IA.', { cause }),
      {
        getStatus: () => 502,
      },
    );
    const { ipc } = setup({}, jest.fn().mockRejectedValue(wrapper));

    await expect(ipc.invoke(IpcChannels.library.documents.suggest, { id: 'abc' })).resolves.toEqual(
      {
        ok: false,
        error: { code: 'NOT_CONFIGURED', message: 'Chave da API do Gemini não configurada.' },
      },
    );
  });

  it('when the document does not exist, should answer NOT_FOUND', async () => {
    const { ipc } = setup(
      {},
      jest.fn().mockRejectedValue(new HttpLikeError('Documento "x" não encontrado.', 404)),
    );

    await expect(
      ipc.invoke(IpcChannels.library.documents.suggest, { id: 'x' }),
    ).resolves.toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
