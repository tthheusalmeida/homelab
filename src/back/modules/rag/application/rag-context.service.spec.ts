import { contextBudget } from '../../../../shared/rag-budget';
import type { RagHit } from '../domain/rag.types';

import { RagContextService } from './rag-context.service';
import type { RagSearchService } from './rag-search.service';

const MEDIUM = contextBudget();

const hit = (id: string, overrides: Partial<RagHit> = {}): RagHit => ({
  chunkId: `${id}#0`,
  documentId: id,
  title: `Página ${id}`,
  category: [],
  headingPath: [],
  anchor: null,
  line: 1,
  text: 'texto curto',
  score: 10,
  coverage: 1,
  ...overrides,
});

describe('RagContextService', () => {
  let search: { search: jest.Mock };
  let service: RagContextService;

  const found = (...hits: RagHit[]) =>
    search.search.mockResolvedValue({
      hits,
      documents: 1,
      chunks: 1,
      elapsedMs: 1,
      semantic: false,
    });

  const foundBySense = (...hits: RagHit[]) =>
    search.search.mockResolvedValue({
      hits,
      documents: 1,
      chunks: 1,
      elapsedMs: 1,
      semantic: true,
    });

  const many = (count: number) =>
    Array.from({ length: count }, (_, index) => hit(`p${index}`, { score: 10 - index * 0.1 }));

  beforeEach(() => {
    search = { search: jest.fn() };
    service = new RagContextService(search as unknown as RagSearchService);
  });

  describe('quais trechos entram', () => {
    it('when the search finds good hits, should return them in order', async () => {
      found(hit('a', { score: 10 }), hit('b', { score: 8 }));

      const result = await service.retrieve('o que diz a primeira maneira do devops');

      expect(result.map((item) => item.documentId)).toEqual(['a', 'b']);
    });

    it('when a hit has the question words only in part, should leave it out', async () => {
      found(hit('a'), hit('b', { coverage: 0.34 }));

      const result = await service.retrieve('pergunta qualquer longa');

      expect(result.map((item) => item.documentId)).toEqual(['a']);
    });

    it('when a hit scores far below the best one, should leave it out', async () => {
      found(hit('a', { score: 20 }), hit('b', { score: 3 }));

      const result = await service.retrieve('pergunta qualquer longa');

      expect(result.map((item) => item.documentId)).toEqual(['a']);
    });

    it('when nothing is found, should return no context', async () => {
      found();

      await expect(service.retrieve('oi, tudo bem?')).resolves.toEqual([]);
    });
  });

  describe('com a busca por sentido', () => {
    it('when a hit has no question words but its meaning is close, should keep it', async () => {
      foundBySense(hit('a', { coverage: 0, similarity: 0.5 }));

      const result = await service.retrieve('como isolar aplicações sem máquina virtual');

      expect(result.map((item) => item.documentId)).toEqual(['a']);
    });

    it('when a hit has neither the words nor a close meaning, should leave it out', async () => {
      foundBySense(hit('a', { coverage: 0, similarity: 0.17 }));

      expect(await service.retrieve('qual a capital da frança')).toEqual([]);
    });

    it('when a hit has most of the words, should keep it even with a low similarity', async () => {
      foundBySense(hit('a', { coverage: 0.8, similarity: 0.1 }));

      expect(await service.retrieve('pergunta qualquer longa')).toHaveLength(1);
    });

    it('when the scores come from two lists, should not cut by the score of the best one', async () => {
      foundBySense(
        hit('a', { score: 0.03, coverage: 0, similarity: 0.5 }),
        hit('b', { score: 0.001, coverage: 0, similarity: 0.4 }),
      );

      expect(await service.retrieve('pergunta qualquer longa')).toHaveLength(2);
    });
  });

  describe('corte pela semelhança do melhor trecho', () => {
    it('when a hit is far below the best similarity, should leave it out even with the words', async () => {
      foundBySense(
        hit('a', { coverage: 1, similarity: 0.7 }),
        hit('b', { coverage: 1, similarity: 0.4 }),
      );

      const result = await service.retrieve('pergunta qualquer longa');

      expect(result.map((item) => item.documentId)).toEqual(['a']);
    });

    it('when a hit is close to the best similarity, should keep it', async () => {
      foundBySense(
        hit('a', { coverage: 0, similarity: 0.5 }),
        hit('b', { coverage: 0, similarity: 0.45 }),
      );

      const result = await service.retrieve('pergunta qualquer longa');

      expect(result.map((item) => item.documentId)).toEqual(['a', 'b']);
    });

    it('when a hit has no vector yet, should not cut it by similarity', async () => {
      foundBySense(hit('a', { coverage: 1, similarity: 0.7 }), hit('b', { coverage: 1 }));

      const result = await service.retrieve('pergunta qualquer longa');

      expect(result.map((item) => item.documentId)).toEqual(['a', 'b']);
    });

    it('when the best similarity is weak, should keep the hits near it', async () => {
      foundBySense(
        hit('a', { coverage: 0, similarity: 0.45 }),
        hit('b', { coverage: 0, similarity: 0.4 }),
      );

      expect(await service.retrieve('pergunta qualquer longa')).toHaveLength(2);
    });
  });

  describe('quantos trechos cabem na janela do modelo', () => {
    it('when the window is unknown, should keep the medium number of hits', async () => {
      found(...many(20));

      await expect(service.retrieve('pergunta qualquer longa')).resolves.toHaveLength(
        MEDIUM.maxHits,
      );
    });

    it('when the window is short, should keep fewer hits', async () => {
      found(...many(20));

      const result = await service.retrieve('pergunta qualquer longa', undefined, {
        contextLimit: 4096,
      });

      expect(result).toHaveLength(contextBudget(4096).maxHits);
      expect(result.length).toBeLessThan(MEDIUM.maxHits);
    });

    it('when the window is long, should keep more hits', async () => {
      found(...many(20));

      const result = await service.retrieve('pergunta qualquer longa', undefined, {
        contextLimit: 262_144,
      });

      expect(result).toHaveLength(contextBudget(262_144).maxHits);
      expect(result.length).toBeGreaterThan(MEDIUM.maxHits);
    });

    it('when the model is tiny, should keep few hits even with a huge window', async () => {
      found(...many(20));

      const result = await service.retrieve('pergunta qualquer longa', undefined, {
        contextLimit: 262_144,
        modelBillions: 0.8,
      });

      expect(result).toHaveLength(contextBudget(4096).maxHits);
    });

    it('when the texts would exceed the size limit, should stop adding hits but keep at least one', async () => {
      const big = 'x'.repeat(MEDIUM.maxChars - 100);

      found(hit('a', { text: big }), hit('b', { text: big }), hit('c', { text: big }));

      const result = await service.retrieve('pergunta qualquer longa');

      expect(result.map((item) => item.documentId)).toEqual(['a']);
    });

    it('when the window is short, should also cap the size of the texts lower', async () => {
      const text = 'x'.repeat(1_500);

      found(hit('a', { text }), hit('b', { text }), hit('c', { text }));

      const result = await service.retrieve('pergunta qualquer longa', undefined, {
        contextLimit: 4096,
      });

      expect(result.map((item) => item.documentId)).toEqual(['a', 'b']);
    });

    it('when searching, should ask for twice the hits it can use, so there is room to filter', async () => {
      found();

      await service.retrieve('pergunta qualquer longa', undefined, { contextLimit: 262_144 });

      expect(search.search).toHaveBeenCalledWith(
        'pergunta qualquer longa',
        contextBudget(262_144).maxHits * 2,
      );
    });
  });

  describe('pergunta de acompanhamento', () => {
    it('when the question points back to what was said, should search it with the previous one', async () => {
      found(hit('a'));

      await service.retrieve('e a segunda?', 'o que diz a primeira maneira do devops');

      expect(search.search).toHaveBeenCalledWith(
        'o que diz a primeira maneira do devops e a segunda?',
        MEDIUM.maxHits * 2,
      );
    });

    it('when the short question has a subject of its own, should search it alone', async () => {
      found(hit('a'));

      await service.retrieve('E sobre devops?', 'O que você tem de DORA?');

      expect(search.search).toHaveBeenCalledWith('E sobre devops?', MEDIUM.maxHits * 2);
    });

    it('when the user says the subject changed, should search it alone even if it points back', async () => {
      found(hit('a'));

      await service.retrieve('Vamos falar só sobre isso: telemetria', 'O que você tem de DORA?');

      expect(search.search).toHaveBeenCalledWith(
        'Vamos falar só sobre isso: telemetria',
        MEDIUM.maxHits * 2,
      );
    });

    it('when the question is long enough on its own, should not mix in the previous one', async () => {
      found(hit('a'));

      await service.retrieve('qual a regra da barra de progresso do aplicativo', 'outra coisa');

      expect(search.search).toHaveBeenCalledWith(
        'qual a regra da barra de progresso do aplicativo',
        MEDIUM.maxHits * 2,
      );
    });

    it('when it points back but there is no previous question, should search it alone', async () => {
      found();

      await service.retrieve('e a segunda?');

      expect(search.search).toHaveBeenCalledWith('e a segunda?', MEDIUM.maxHits * 2);
    });
  });
});
