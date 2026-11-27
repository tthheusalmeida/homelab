import * as fs from 'node:fs';

import { createTmpLibrary, type TmpLibrary } from '../../../testing/tmp-library';
import { newPendingMeta } from '../../library/domain/document';
import type { DocumentMeta } from '../../library/domain/library.types';
import { LibraryIndex } from '../../library/infrastructure/library-index';
import { normalize } from '../domain/vectors';
import { EmbeddingStore } from '../infrastructure/embedding-store';

import type { Embedder } from './embedder';
import { RagSearchService } from './rag-search.service';

const FIRST_WAY = [
  '# Práticas da Primeira Maneira',
  '',
  'Resumo geral do assunto.',
  '',
  '## Fluxo de trabalho',
  '',
  'A Primeira Maneira enfatiza o desempenho do sistema como um todo, do desenvolvimento até a operação.',
  '',
  '## Visualizar o trabalho',
  '',
  'Quadros kanban tornam o trabalho visível para a equipe.',
].join('\n');

const SECOND_WAY = [
  '# Segunda Maneira',
  '',
  '## Feedback rápido',
  '',
  'A Segunda Maneira cria ciclos de feedback de baixo para cima, para corrigir problemas cedo.',
].join('\n');

const DOWNLOADS = [
  '# Download de vídeos',
  '',
  '## Plataformas',
  '',
  'O download usa um programa externo e pede login em alguns sites.',
].join('\n');

describe('RagSearchService', () => {
  let tmp: TmpLibrary;
  let library: LibraryIndex;
  let service: RagSearchService;

  const meta = (
    id: string,
    title: string,
    overrides: Partial<DocumentMeta> = {},
  ): DocumentMeta => ({
    ...newPendingMeta({ id, title, type: 'summary' }),
    status: 'published',
    category: ['Livros', 'DevOps'],
    ...overrides,
  });

  const reload = async () => {
    await library.rebuild();
    service.invalidate();
  };

  beforeEach(async () => {
    tmp = createTmpLibrary();
    library = new LibraryIndex(tmp.storage);
    service = new RagSearchService(library, tmp.storage);

    await tmp.storage.save(meta('first', 'Práticas da Primeira Maneira'), FIRST_WAY);
    await tmp.storage.save(meta('second', 'Segunda Maneira'), SECOND_WAY);
    await tmp.storage.save(meta('video', 'Download de vídeos', { category: ['App'] }), DOWNLOADS);
    await reload();
  });

  afterEach(() => tmp.cleanup());

  it('when the question matches a section, should return its page first with the section anchor', async () => {
    const { hits } = await service.search('o que diz a primeira maneira do devops?');

    expect(hits[0]).toMatchObject({
      documentId: 'first',
      title: 'Práticas da Primeira Maneira',
      category: ['Livros', 'DevOps'],
      headingPath: ['Práticas da Primeira Maneira', 'Fluxo de trabalho'],
      anchor: 'fluxo-de-trabalho',
    });
    expect(hits[0].text).toContain('desempenho do sistema');
  });

  it('when a hit is returned, should say where it starts so the page can open there', async () => {
    const { hits } = await service.search('kanban');

    expect(hits[0]).toMatchObject({
      documentId: 'first',
      anchor: 'visualizar-o-trabalho',
      line: 11,
    });
  });

  it('when the question has a typo, should still find the right page', async () => {
    const { hits } = await service.search('kanbna equipe');

    expect(hits[0].documentId).toBe('first');
  });

  it('when the question has no accents, should find text that has accents', async () => {
    const { hits } = await service.search('feedback rapido');

    expect(hits[0].documentId).toBe('second');
  });

  it('when the question uses the plural, should find the singular', async () => {
    const { hits } = await service.search('quadro');

    expect(hits[0].documentId).toBe('first');
  });

  it('when the question is only the start of a word, should still find it', async () => {
    const { hits } = await service.search('plataf');

    expect(hits[0].documentId).toBe('video');
  });

  it('when nothing in the pages matches, should return no hits', async () => {
    await expect(service.search('quantum chromodynamics')).resolves.toMatchObject({ hits: [] });
  });

  it('when the question is only filler words, should return no hits', async () => {
    await expect(service.search('o que é isso')).resolves.toMatchObject({ hits: [] });
  });

  it('when asked, should say how many pages and chunks it knows', async () => {
    const result = await service.search('kanban');

    expect(result.documents).toBe(3);
    expect(result.chunks).toBe(5);
    expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('when a limit is given, should return no more hits than that', async () => {
    const { hits } = await service.search('maneira', 2);

    expect(hits).toHaveLength(2);
  });

  it('when one page has many matching sections, should not let it fill the whole list', async () => {
    const sections = Array.from(
      { length: 8 },
      (_, index) => `## Parte ${index}\n\nEste trecho fala de qualidade e de qualidade.`,
    ).join('\n\n');

    await tmp.storage.save(meta('big', 'Qualidade'), sections);
    await reload();

    const { hits } = await service.search('qualidade', 8);

    expect(hits.filter((hit) => hit.documentId === 'big')).toHaveLength(3);
  });

  it('when a page is still pending in the inbox, should leave it out of the search', async () => {
    await tmp.storage.save(
      meta('draft', 'Rascunho', { status: 'pending', category: [] }),
      '## Segredo\n\nconteudo exclusivo zebra',
    );
    await reload();

    await expect(service.search('zebra')).resolves.toMatchObject({ hits: [] });
  });

  it('when a page is edited, should find the new text and forget the old one', async () => {
    await tmp.storage.save(
      meta('video', 'Download de vídeos', { category: ['App'] }),
      '# Download de vídeos\n\n## Plataformas\n\nAgora o texto fala de girafas e savanas.',
    );
    await reload();

    expect((await service.search('girafas')).hits[0].documentId).toBe('video');
    await expect(service.search('login')).resolves.toMatchObject({ hits: [] });
  });

  it('when a page is deleted, should stop returning it', async () => {
    const [stored] = library.all().filter((doc) => doc.meta.id === 'second');

    fs.rmSync(stored.path);
    await reload();

    await expect(service.search('feedback')).resolves.toMatchObject({ hits: [] });
  });

  it('when the library is empty, should return no hits instead of failing', async () => {
    const empty = createTmpLibrary();

    try {
      const emptyService = new RagSearchService(new LibraryIndex(empty.storage), empty.storage);

      await expect(emptyService.search('qualquer')).resolves.toMatchObject({
        hits: [],
        documents: 0,
        chunks: 0,
      });
    } finally {
      empty.cleanup();
    }
  });

  it('when searches come back to back, should not look at the files again in between', async () => {
    await service.search('kanban');
    await tmp.storage.save(meta('late', 'Tardia'), '## Nova\n\ncapivara');
    await library.rebuild();

    await expect(service.search('capivara')).resolves.toMatchObject({ hits: [] });

    service.invalidate();

    expect((await service.search('capivara')).hits[0].documentId).toBe('late');
  });
});

describe('RagSearchService: busca por sentido', () => {
  let tmp: TmpLibrary;
  let library: LibraryIndex;
  let store: EmbeddingStore;
  let embedder: { embed: jest.Mock };
  let service: RagSearchService;

  const meta = (id: string, title: string): DocumentMeta => ({
    ...newPendingMeta({ id, title, type: 'summary' }),
    status: 'published',
    category: ['Livros'],
  });

  /** Vetor de brinquedo: eixo 0 = "containers", eixo 1 = "dinheiro". */
  const vectorOf = (text: string) =>
    normalize([
      /contêiner|container|isol/i.test(text) ? 1 : 0.05,
      /dinheiro|banco/i.test(text) ? 1 : 0.05,
    ]);

  beforeEach(async () => {
    tmp = createTmpLibrary();
    library = new LibraryIndex(tmp.storage);
    store = new EmbeddingStore(null, 'm');
    embedder = {
      embed: jest.fn(async (texts: string[]) => texts.map(vectorOf)),
    };
    service = new RagSearchService(library, tmp.storage, embedder as Embedder, store);

    await tmp.storage.save(
      meta('docker', 'Docker'),
      ['# Docker', '', 'Contêineres isolam processos sem máquina virtual.'].join(
        String.fromCharCode(10),
      ),
    );
    await tmp.storage.save(
      meta('banco', 'Banco'),
      ['# Banco', '', 'O banco guarda o dinheiro dos clientes.'].join(String.fromCharCode(10)),
    );
    await library.rebuild();
    service.invalidate();
  });

  afterEach(() => tmp.cleanup());

  it('when the vectors are not ready yet, should search by words only', async () => {
    embedder.embed.mockResolvedValue(null);

    const result = await service.search('isolar aplicações');

    expect(result.semantic).toBe(false);
    expect(result.hits.every((hit) => hit.similarity === undefined)).toBe(true);
  });

  it('when the vectors are ready, should find a page by meaning even without its words', async () => {
    await service.search('qualquer coisa');
    await service.whenEmbedded();

    const result = await service.search('como isolar aplicações sem máquina virtual');

    expect(result.semantic).toBe(true);
    expect(result.hits[0]).toMatchObject({ documentId: 'docker' });
    expect(result.hits[0].similarity).toBeGreaterThan(0.9);
  });

  it('when the same text was already embedded, should not ask the model again', async () => {
    await service.search('x');
    await service.whenEmbedded();
    const asked = embedder.embed.mock.calls.length;

    service.invalidate();
    await service.search('y');
    await service.whenEmbedded();

    // só a pergunta nova foi ao modelo, nenhum trecho
    expect(embedder.embed.mock.calls.length).toBe(asked + 1);
  });

  it('when the model of vectors is missing, should keep answering by words', async () => {
    embedder.embed.mockResolvedValue(null);

    await service.search('x');
    await service.whenEmbedded();

    await expect(service.search('docker')).resolves.toMatchObject({ semantic: false });
  });

  it('when there is no embedder at all, should search by words as before', async () => {
    const plain = new RagSearchService(library, tmp.storage);

    await expect(plain.search('docker')).resolves.toMatchObject({ semantic: false });
  });
});
