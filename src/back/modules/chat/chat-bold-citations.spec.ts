import {
  boldCitations,
  referencesFor,
  withoutCitations,
  type ChatContextPassage,
} from './chat-context';

const passage = (overrides: Partial<ChatContextPassage> = {}): ChatContextPassage => ({
  documentId: 'doc-1',
  title: 'DORA',
  category: [],
  headingPath: ['DORA'],
  anchor: 'a',
  text: 'texto',
  ...overrides,
});

describe('boldCitations', () => {
  it('when the answer has a mark, should wrap it in bold', () => {
    expect(boldCitations('O DORA mede quatro métricas [1].', 2)).toBe(
      'O DORA mede quatro métricas **[1]**.',
    );
  });

  it('when the answer has a mark with several numbers, should bold them together', () => {
    expect(boldCitations('Vale para os dois [2,3] e [1, 2].', 3)).toBe(
      'Vale para os dois **[2,3]** e **[1, 2]**.',
    );
  });

  it('when the mark is already in bold, should not double it', () => {
    expect(boldCitations('Já veio **[1]** certo.', 1)).toBe('Já veio **[1]** certo.');
  });

  it('when the mark sits inside a bold phrase, should leave it as it is', () => {
    expect(boldCitations('Uma **frase em destaque [1]** e depois [1].', 1)).toBe(
      'Uma **frase em destaque [1]** e depois **[1]**.',
    );
  });

  it('when the number is not one of the excerpts, should leave it alone', () => {
    expect(boldCitations('Veja [9] e [1].', 2)).toBe('Veja [9] e **[1]**.');
    expect(boldCitations('Veja [0].', 2)).toBe('Veja [0].');
  });

  it('when a list mixes real and invalid numbers, should leave the whole mark alone', () => {
    expect(boldCitations('Veja [1,9].', 2)).toBe('Veja [1,9].');
  });

  it('when the mark is inside code, should not touch it', () => {
    const text = 'Use `lista[1]` e:\n```js\nconst x = a[1];\n```\nfim [1].';

    expect(boldCitations(text, 2)).toBe(
      'Use `lista[1]` e:\n```js\nconst x = a[1];\n```\nfim **[1]**.',
    );
  });

  it('when there were no excerpts, should leave every mark as written', () => {
    expect(boldCitations('Índice [1] do array.', 0)).toBe('Índice [1] do array.');
  });
});

describe('withoutCitations com negrito e listas', () => {
  it('when the marks come in bold, should remove them with the space before', () => {
    expect(withoutCitations('Mede quatro métricas **[1]** e mais **[2,3]**.')).toBe(
      'Mede quatro métricas e mais.',
    );
  });
});

describe('referencesFor com marcas de vários números', () => {
  const passages = [
    passage(),
    passage({ documentId: 'doc-2', anchor: 'b' }),
    passage({ documentId: 'doc-3', anchor: 'c' }),
  ];

  it('when the answer cites [2,3] in bold, should list both sections', () => {
    expect(
      referencesFor('Os dois falam disso **[2,3]**.', passages).map((r) => r.documentId),
    ).toEqual(['doc-2', 'doc-3']);
  });
});
