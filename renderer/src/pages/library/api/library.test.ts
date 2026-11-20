import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import {
  archiveDocument,
  createArticle,
  discardDocument,
  deleteInfographic,
  deleteMindMap,
  generateInfographic,
  saveInfographic,
  generateMindMap,
  getCategories,
  getDocument,
  getDocuments,
  getInbox,
  getIndexStatus,
  getInfographic,
  getMindMap,
  saveMindMap,
  saveMindMapImage,
  getTags,
  publishDocument,
  reindex,
  suggestClassification,
  toListFilters,
  updateDocument,
} from './library';

const detail = { meta: { id: 'abc' }, content: 'c' };

describe('toListFilters', () => {
  it('when there are no filters, should answer an empty payload', () => {
    expect(toListFilters()).toEqual({});
    expect(toListFilters({})).toEqual({});
  });

  it('when text has spaces around, should send it trimmed; blank text is omitted', () => {
    expect(toListFilters({ q: '  devops  ' })).toEqual({ q: 'devops' });
    expect(toListFilters({ q: '   ' })).toEqual({});
  });

  it('when the content filter has items, should send them; an empty list is omitted', () => {
    expect(toListFilters({ has: ['infographic', 'mind-map'] })).toEqual({
      has: ['infographic', 'mind-map'],
    });
    expect(toListFilters({ has: [] })).toEqual({});
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

describe('library api: leitura por IPC', () => {
  it('when listing documents, should send the cleaned filters to library:documents:list', async () => {
    const docs = [{ id: '1' }];
    const invoke = mockApi({ [IpcChannels.library.documents.list]: () => ok(docs) });

    await expect(getDocuments({ q: ' oi ', tags: ['t'] })).resolves.toEqual(docs);

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.list, {
      q: 'oi',
      tags: ['t'],
    });
  });

  it('when listing without filters, should still send an object payload', async () => {
    const invoke = mockApi({ [IpcChannels.library.documents.list]: () => ok([]) });

    await getDocuments();

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.list, {});
  });

  it('when getting a document, should send its id as it is (no URL encoding)', async () => {
    const invoke = mockApi({ [IpcChannels.library.documents.get]: () => ok(detail) });

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
  });
});

describe('library api: escrita por IPC', () => {
  it('when reindexing, should call library:reindex without payload and return the result', async () => {
    const invoke = mockApi({
      [IpcChannels.library.reindex]: () => ok({ indexed: 5, errors: [] }),
    });

    await expect(reindex()).resolves.toEqual({ indexed: 5, errors: [] });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.reindex);
  });

  it('when publishing, should send the id together with the input', async () => {
    const invoke = mockApi({ [IpcChannels.library.documents.publish]: () => ok(detail) });

    await expect(
      publishDocument('a b', { category: ['X'], tags: ['t'], title: 'T' }),
    ).resolves.toEqual(detail);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.publish, {
      id: 'a b',
      category: ['X'],
      tags: ['t'],
      title: 'T',
    });
  });

  it('when archiving, should send the id to library:documents:archive', async () => {
    const invoke = mockApi({ [IpcChannels.library.documents.archive]: () => ok(detail) });

    await archiveDocument('1');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.archive, { id: '1' });
  });

  it('when discarding, should send the id to library:documents:delete and resolve with nothing', async () => {
    const invoke = mockApi({
      [IpcChannels.library.documents.delete]: () => ok(undefined),
    });

    await expect(discardDocument('1')).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.delete, { id: '1' });
  });

  it('when creating an article, should send the input as the payload', async () => {
    const invoke = mockApi({ [IpcChannels.library.documents.createArticle]: () => ok(detail) });
    const input = { title: 'T', category: ['C'], content: 'x' };

    await expect(createArticle(input)).resolves.toEqual(detail);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.createArticle, input);
  });

  it('when suggesting without a model, should send only the id', async () => {
    const suggestion = { title: 'T', category: ['A'], tags: [], model: 'm' };
    const invoke = mockApi({ [IpcChannels.library.documents.suggest]: () => ok(suggestion) });

    await expect(suggestClassification('1')).resolves.toEqual(suggestion);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.suggest, { id: '1' });
  });

  it('when suggesting with a model, should send id and modelId', async () => {
    const invoke = mockApi({ [IpcChannels.library.documents.suggest]: () => ok({}) });

    await suggestClassification('1', 'gemini-x');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.suggest, {
      id: '1',
      modelId: 'gemini-x',
    });
  });

  it('when the AI fails to suggest, should reject with the message from the main', async () => {
    mockApi({
      [IpcChannels.library.documents.suggest]: () =>
        failure('PROVIDER_FAILED', 'Não foi possível obter a sugestão da IA. Tente novamente.'),
    });

    await expect(suggestClassification('1')).rejects.toThrow(
      'Não foi possível obter a sugestão da IA. Tente novamente.',
    );
  });

  it('when updating, should send the id together with the changed fields', async () => {
    const invoke = mockApi({ [IpcChannels.library.documents.update]: () => ok(detail) });

    await updateDocument('1', { title: 'N', content: '# x' });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.documents.update, {
      id: '1',
      title: 'N',
      content: '# x',
    });
  });

  it('when the service rejects the change, should reject with its VALIDATION message', async () => {
    mockApi({
      [IpcChannels.library.documents.update]: () =>
        failure('VALIDATION', 'O conteúdo não pode ficar vazio.'),
    });

    await expect(updateDocument('1', { content: ' ' })).rejects.toThrow(
      'O conteúdo não pode ficar vazio.',
    );
  });
});

describe('mind map api', () => {
  const map = { nodes: [], model: 'm', createdAt: 'd', stale: false };

  it('when reading the saved map, should send the page id and return the map or null', async () => {
    const invoke = mockApi({ [IpcChannels.library.mindMap.get]: () => ok(null) });

    await expect(getMindMap('1')).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.mindMap.get, { id: '1' });
  });

  it('when generating without a model, should send only the id', async () => {
    const invoke = mockApi({ [IpcChannels.library.mindMap.generate]: () => ok(map) });

    await expect(generateMindMap('1')).resolves.toEqual(map);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.mindMap.generate, { id: '1' });
  });

  it('when generating with a model, should send id and modelId', async () => {
    const invoke = mockApi({ [IpcChannels.library.mindMap.generate]: () => ok(map) });

    await generateMindMap('1', 'gemini-x');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.mindMap.generate, {
      id: '1',
      modelId: 'gemini-x',
    });
  });

  it('when the AI fails to generate, should reject with the message from the main', async () => {
    mockApi({
      [IpcChannels.library.mindMap.generate]: () =>
        failure('PROVIDER_FAILED', 'O limite de uso do Gemini foi atingido.'),
    });

    await expect(generateMindMap('1')).rejects.toThrow('O limite de uso do Gemini foi atingido.');
  });
});

describe('mind map image api', () => {
  it('when saving the image, should send the name and the PNG and return the result', async () => {
    const invoke = mockApi({
      [IpcChannels.library.mindMap.saveImage]: () => ok({ saved: true, path: 'D:/mapa.png' }),
    });

    await expect(saveMindMapImage('Mapa mental - Redes', 'UE5H')).resolves.toEqual({
      saved: true,
      path: 'D:/mapa.png',
    });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.mindMap.saveImage, {
      fileName: 'Mapa mental - Redes',
      dataBase64: 'UE5H',
    });
  });

  it('when a format is given, should send it along', async () => {
    const invoke = mockApi({
      [IpcChannels.library.mindMap.saveImage]: () => ok({ saved: true, path: 'D:/i.pdf' }),
    });

    await saveMindMapImage('Infográfico', 'JVBE', 'pdf');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.mindMap.saveImage, {
      fileName: 'Infográfico',
      dataBase64: 'JVBE',
      format: 'pdf',
    });
  });

  it('when the user cancels the save dialog, should resolve with saved false', async () => {
    mockApi({ [IpcChannels.library.mindMap.saveImage]: () => ok({ saved: false }) });

    await expect(saveMindMapImage('a', 'b')).resolves.toEqual({ saved: false });
  });

  it('when the main fails to save, should reject with its message', async () => {
    mockApi({
      [IpcChannels.library.mindMap.saveImage]: () =>
        failure('PERSIST_FAILED', 'Não foi possível salvar a imagem.'),
    });

    await expect(saveMindMapImage('a', 'b')).rejects.toThrow('Não foi possível salvar a imagem.');
  });
});

describe('mind map save api', () => {
  const nodes = [{ label: 'Termo', note: 'Frase', children: [{ label: 'Filho', children: [] }] }];

  it('when saving the edited map, should send the page id, the subtitle and the branches', async () => {
    const saved = {
      subtitle: 'Sobre redes',
      nodes,
      model: 'm',
      createdAt: 'd',
      stale: false,
      edited: true,
    };
    const invoke = mockApi({ [IpcChannels.library.mindMap.save]: () => ok(saved) });

    await expect(saveMindMap('1', { subtitle: 'Sobre redes', nodes })).resolves.toEqual(saved);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.mindMap.save, {
      id: '1',
      subtitle: 'Sobre redes',
      nodes,
    });
  });

  it('when there is no subtitle, should send only the id and the branches', async () => {
    const invoke = mockApi({ [IpcChannels.library.mindMap.save]: () => ok({}) });

    await saveMindMap('1', { nodes });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.mindMap.save, { id: '1', nodes });
  });

  it('when the main rejects the map, should reject with its message', async () => {
    mockApi({
      [IpcChannels.library.mindMap.save]: () =>
        failure('VALIDATION', 'O mapa precisa ter pelo menos um ramo com texto.'),
    });

    await expect(saveMindMap('1', { nodes: [] })).rejects.toThrow(
      'O mapa precisa ter pelo menos um ramo com texto.',
    );
  });
});

describe('infographic api', () => {
  const infographic = {
    layout: 'steps',
    title: 'T',
    piece: '',
    items: [],
    model: 'm',
    createdAt: 'd',
    stale: false,
  };

  it('when reading the saved infographic, should send the page id and return it or null', async () => {
    const invoke = mockApi({ [IpcChannels.library.infographic.get]: () => ok(null) });

    await expect(getInfographic('1')).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.infographic.get, { id: '1' });
  });

  it('when saving the infographic, should send the id and the edited content', async () => {
    const input = { title: 'T', piece: 'financas.moedas', sections: [] };
    const invoke = mockApi({
      [IpcChannels.library.infographic.save]: () => ok({ ...infographic, edited: true }),
    });

    await expect(saveInfographic('1', input)).resolves.toMatchObject({ edited: true });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.infographic.save, {
      id: '1',
      infographic: input,
    });
  });

  it('when saving fails, should reject with the message of the error', async () => {
    mockApi({
      [IpcChannels.library.infographic.save]: () =>
        failure('VALIDATION', 'O infográfico editado precisa de título e de seções válidas.'),
    });

    await expect(saveInfographic('1', { title: '', piece: '', sections: [] })).rejects.toThrow(
      'precisa de título',
    );
  });

  it('when deleting the infographic, should send only the id of the page', async () => {
    const invoke = mockApi({ [IpcChannels.library.infographic.delete]: () => ok(undefined) });

    await expect(deleteInfographic('1')).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.infographic.delete, { id: '1' });
  });

  it('when deleting the mind map, should send only the id of the page', async () => {
    const invoke = mockApi({ [IpcChannels.library.mindMap.delete]: () => ok(undefined) });

    await expect(deleteMindMap('1')).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.mindMap.delete, { id: '1' });
  });

  it('when deleting fails, should reject with the message of the error', async () => {
    mockApi({
      [IpcChannels.library.infographic.delete]: () =>
        failure('NOT_FOUND', 'Documento não encontrado'),
    });

    await expect(deleteInfographic('x')).rejects.toThrow('Documento não encontrado');
  });

  it('when generating without options, should send only the id', async () => {
    const invoke = mockApi({ [IpcChannels.library.infographic.generate]: () => ok(infographic) });

    await expect(generateInfographic('1')).resolves.toEqual(infographic);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.infographic.generate, { id: '1' });
  });

  it('when generating with a layout and a model, should send them with the id', async () => {
    const invoke = mockApi({ [IpcChannels.library.infographic.generate]: () => ok(infographic) });

    await generateInfographic('1', { layout: 'funnel', modelId: 'gemini-x' });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.library.infographic.generate, {
      id: '1',
      layout: 'funnel',
      modelId: 'gemini-x',
    });
  });

  it('when the AI fails, should reject with the message from the main process', async () => {
    mockApi({
      [IpcChannels.library.infographic.generate]: () =>
        failure('PROVIDER_FAILED', 'O limite de uso foi atingido.'),
    });

    await expect(generateInfographic('1')).rejects.toThrow('O limite de uso foi atingido.');
  });
});
