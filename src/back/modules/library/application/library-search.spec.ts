import { BadRequestException } from '@nestjs/common';

import { createTmpLibrary, type TmpLibrary } from '../../../testing/tmp-library';
import { newPendingMeta } from '../domain/document';
import type { DocumentMeta } from '../domain/library.types';
import type { StoredInfographic } from '../domain/infographic';
import { InfographicStore } from '../infrastructure/infographic-store';
import { LibraryIndex } from '../infrastructure/library-index';
import { MindMapStore } from '../infrastructure/mind-map-store';
import { LibrarySearch } from './library-search';

describe('LibrarySearch', () => {
  let tmp: TmpLibrary;
  let index: LibraryIndex;
  let search: LibrarySearch;

  const add = async (
    id: string,
    title: string,
    body: string,
    overrides: Partial<DocumentMeta> = {},
  ) => {
    const meta: DocumentMeta = {
      ...newPendingMeta({ id, title, type: 'summary' }),
      status: 'published',
      category: ['Ciência', 'DevOps'],
      ...overrides,
    };

    index.upsert(await tmp.storage.read(await tmp.storage.save(meta, body)));
  };

  const titles = async (filters: Parameters<LibrarySearch['search']>[0]) =>
    (await search.search(filters)).map((doc) => doc.title);

  beforeEach(() => {
    tmp = createTmpLibrary();
    index = new LibraryIndex(tmp.storage);
    search = new LibrarySearch(index, tmp.storage);
  });

  afterEach(() => tmp.cleanup());

  describe('filters', () => {
    it('when no status is given, should return only published documents', async () => {
      await add('1', 'Publicado', 'x');
      await add('2', 'Arquivado', 'x', { status: 'archived' });
      await add('3', 'Pendente', 'x', { status: 'pending', category: [] });

      expect(await titles({})).toEqual(['Publicado']);
    });

    it('when status is archived or pending, should return those documents', async () => {
      await add('2', 'Arquivado', 'x', { status: 'archived' });
      await add('3', 'Pendente', 'x', { status: 'pending', category: [] });

      expect(await titles({ status: 'archived' })).toEqual(['Arquivado']);
      expect(await titles({ status: 'pending' })).toEqual(['Pendente']);
    });

    it('when filtering by type, should return only that type', async () => {
      await add('1', 'Resumo', 'x', { type: 'summary' });
      await add('2', 'Transcrição', 'x', { type: 'transcription' });

      expect(await titles({ type: 'transcription' })).toEqual(['Transcrição']);
    });

    it('when filtering by source, should return only that source', async () => {
      await add('1', 'De vídeo', 'x', { source: 'video' });
      await add('2', 'Manual', 'x', { source: 'manual' });

      expect(await titles({ source: 'manual' })).toEqual(['Manual']);
    });

    it('when filtering by category, should include documents in the subtree', async () => {
      await add('1', 'Prática', 'x', {
        category: ['Ciência', 'DevOps', 'Práticas'],
      });
      await add('2', 'Redes', 'x', { category: ['Ciência', 'Redes'] });
      await add('3', 'Química', 'x', { category: ['Química'] });

      expect(await titles({ category: ['Ciência'] })).toEqual(['Prática', 'Redes']);
      expect(await titles({ category: ['ciencia', 'devops'] })).toEqual(['Prática']);
      expect(await titles({ category: ['Ciência', 'DevOps', 'Práticas'] })).toEqual(['Prática']);
    });

    it('when filtering by several tags, should require all of them', async () => {
      await add('1', 'A', 'x', { tags: ['devops', 'ci'] });
      await add('2', 'B', 'x', { tags: ['devops'] });

      expect(await titles({ tags: ['devops'] })).toEqual(['A', 'B']);
      expect(await titles({ tags: ['DevOps', 'CI'] })).toEqual(['A']);
    });

    it('when combining filters, should apply all of them', async () => {
      await add('1', 'Transcrição DevOps', 'x', { type: 'transcription' });
      await add('2', 'Resumo DevOps', 'x', { type: 'summary' });
      await add('3', 'Transcrição Química', 'x', {
        type: 'transcription',
        category: ['Química'],
      });

      expect(
        await titles({
          category: ['Ciência', 'DevOps'],
          type: 'transcription',
        }),
      ).toEqual(['Transcrição DevOps']);
    });

    it.each([{ type: 'poema' }, { source: 'radio' }, { status: 'lost' }, { sort: 'random' }])(
      'when the filter %j is invalid, should throw',
      async (filters) => {
        await expect(search.search(filters)).rejects.toThrow(BadRequestException);
      },
    );
  });

  describe('text search', () => {
    it('when the text is in the title, should match by metadata', async () => {
      await add('1', 'Práticas da Primeira Maneira', 'x');

      const [result] = await search.search({ q: 'primeira' });

      expect(result.title).toBe('Práticas da Primeira Maneira');
      expect(result.matchedIn).toBe('metadata');
    });

    it('when the text matches a tag, a category or the file name, should match by metadata', async () => {
      await add('1', 'Doc A', 'x', { tags: ['kubernetes'] });
      await add('2', 'Doc B', 'x', { category: ['Química', 'Ligações'] });

      expect(await titles({ q: 'kubernetes' })).toEqual(['Doc A']);
      expect(await titles({ q: 'ligacoes', category: [] })).toEqual(['Doc B']);
      expect(await titles({ q: 'doc_a' })).toEqual(['Doc A']);
    });

    it('when the text is only in the file content, should match by content', async () => {
      await add('1', 'Sem relação', 'O pipeline automatiza a entrega contínua.');

      const [result] = await search.search({ q: 'entrega continua' });

      expect(result.title).toBe('Sem relação');
      expect(result.matchedIn).toBe('content');
    });

    it('when searching, should ignore case and accents', async () => {
      await add('1', 'Doc', 'Integração CONTÍNUA');

      expect(await titles({ q: 'integracao continua' })).toEqual(['Doc']);
    });

    it('when the words are split between metadata and content, should still match', async () => {
      await add('1', 'Docker', 'Containers isolam processos.');

      expect(await titles({ q: 'docker containers' })).toEqual(['Docker']);
    });

    it('when a word is nowhere, should not match', async () => {
      await add('1', 'Docker', 'Containers isolam processos.');

      expect(await titles({ q: 'docker banana' })).toEqual([]);
    });

    it('when the text matches only archived documents, should not return them by default', async () => {
      await add('1', 'Docker', 'x', { status: 'archived' });

      expect(await titles({ q: 'docker' })).toEqual([]);
    });

    it('when a document file cannot be read, should skip it without failing', async () => {
      await add('1', 'Quebrado', 'texto');
      index.get('1')!.path = '/nao/existe_1.md';

      expect(await titles({ q: 'texto' })).toEqual([]);
    });

    it('when there are many documents to read, should still find all content matches', async () => {
      for (let i = 0; i < 20; i++) {
        await add(`id${i}`, `Doc ${String(i).padStart(2, '0')}`, 'palavra-rara aqui');
      }

      expect(await search.search({ q: 'palavra-rara' })).toHaveLength(20);
    });
  });

  describe('sorting', () => {
    it('when sorting by title (default), should use natural alphanumeric order', async () => {
      await add('1', 'Aula 10', 'x');
      await add('2', 'Aula 2', 'x');
      await add('3', 'Árvore', 'x');
      await add('4', 'Banana', 'x');

      expect(await titles({})).toEqual(['Árvore', 'Aula 2', 'Aula 10', 'Banana']);
    });

    it('when sorting by recent, should put the newest first', async () => {
      await add('1', 'Velho', 'x', { createdAt: '2026-01-01T00:00:00.000Z' });
      await add('2', 'Novo', 'x', { createdAt: '2026-06-01T00:00:00.000Z' });

      expect(await titles({ sort: 'recent' })).toEqual(['Novo', 'Velho']);
    });
  });

  describe('result shape', () => {
    it('when returning results, should include metadata, file name and preview but no body', async () => {
      await add('1', 'Doc', '# Título\n\nTexto longo aqui', { tags: ['a'] });

      const [result] = await search.search({});

      expect(result).toMatchObject({
        id: '1',
        title: 'Doc',
        type: 'summary',
        status: 'published',
        tags: ['a'],
        category: ['Ciência', 'DevOps'],
        fileName: 'doc_1.md',
        preview: 'Título Texto longo aqui',
      });
      expect(result).not.toHaveProperty('body');
      expect(result).not.toHaveProperty('content');
    });
  });

  describe('generated content', () => {
    let infographics: InfographicStore;
    let mindMaps: MindMapStore;

    const infographic = {
      contentHash: 'h',
      model: 'm',
      createdAt: '2026-11-20T00:00:00.000Z',
      title: 'T',
      piece: '',
      sections: [],
    } as StoredInfographic;
    const map = { contentHash: 'h', model: 'm', createdAt: '2026-11-20T00:00:00.000Z', nodes: [] };

    beforeEach(async () => {
      infographics = new InfographicStore();
      mindMaps = new MindMapStore();
      search = new LibrarySearch(index, tmp.storage, infographics, mindMaps);

      await add('1', 'Com os dois', 'x');
      await add('2', 'Só infográfico', 'x');
      await add('3', 'Só mapa', 'x');
      await add('4', 'Nenhum', 'x');
      infographics.set('1', infographic);
      infographics.set('2', infographic);
      mindMaps.set('1', map);
      mindMaps.set('3', map);
    });

    it('when no content is requested, should return every page', async () => {
      expect((await titles({})).sort()).toEqual([
        'Com os dois',
        'Nenhum',
        'Só infográfico',
        'Só mapa',
      ]);
      expect((await titles({ has: [] })).length).toBe(4);
    });

    it('when listing, should flag each page that has an infographic and/or a mind map (and only those)', async () => {
      const all = await search.search({});
      const by = (title: string) => all.find((doc) => doc.title === title);

      expect(by('Com os dois')).toMatchObject({ hasInfographic: true, hasMindMap: true });
      expect(by('Só infográfico')).toMatchObject({ hasInfographic: true });
      expect(by('Só infográfico')).not.toHaveProperty('hasMindMap');
      expect(by('Só mapa')).toMatchObject({ hasMindMap: true });
      expect(by('Só mapa')).not.toHaveProperty('hasInfographic');
      expect(by('Nenhum')).not.toHaveProperty('hasInfographic');
      expect(by('Nenhum')).not.toHaveProperty('hasMindMap');
    });

    it('when an infographic was saved before the sections existed, should not flag it nor match the filter', async () => {
      infographics.set('4', {
        contentHash: 'h',
        model: 'm',
        createdAt: 'd',
        title: 'x',
      } as unknown as StoredInfographic);

      expect((await search.search({})).find((doc) => doc.title === 'Nenhum')).not.toHaveProperty(
        'hasInfographic',
      );
      expect(await titles({ has: ['infographic'] })).not.toContain('Nenhum');
    });

    it('when the stores are not available, should flag nothing', async () => {
      const bare = new LibrarySearch(index, tmp.storage);
      const all = await bare.search({});

      expect(all.some((doc) => 'hasInfographic' in doc || 'hasMindMap' in doc)).toBe(false);
    });

    it('when asking for infographics, should return only the pages that have one', async () => {
      expect((await titles({ has: ['infographic'] })).sort()).toEqual([
        'Com os dois',
        'Só infográfico',
      ]);
    });

    it('when asking for mind maps, should return only the pages that have one', async () => {
      expect((await titles({ has: ['mind-map'] })).sort()).toEqual(['Com os dois', 'Só mapa']);
    });

    it('when asking for both, should return only the pages that have everything', async () => {
      expect(await titles({ has: ['infographic', 'mind-map'] })).toEqual(['Com os dois']);
    });

    it('when combined with other filters, should apply them together', async () => {
      expect(await titles({ has: ['infographic'], q: 'só' })).toEqual(['Só infográfico']);
    });

    it('when an infographic is discarded, should leave the page out of the filter', async () => {
      infographics.delete('2');

      expect(await titles({ has: ['infographic'] })).toEqual(['Com os dois']);
    });

    it('when the value is not a known content, should reject the request', async () => {
      await expect(search.search({ has: ['video'] })).rejects.toThrow('conteúdo gerado');
      await expect(search.search({ has: 'infographic' as unknown as string[] })).rejects.toThrow(
        'conteúdo gerado',
      );
    });

    it('when the stores are not available, should not filter anything out by accident', async () => {
      const bare = new LibrarySearch(index, tmp.storage);

      expect((await bare.search({})).length).toBe(4);
      expect(await bare.search({ has: ['infographic'] })).toEqual([]);
    });
  });
});
