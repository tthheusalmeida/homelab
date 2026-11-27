import { buildQuery } from './query-builder';
import { stem } from './text-analysis';

const vocabulary = new Map<string, number>([
  [stem('devops'), 9],
  [stem('maneira'), 7],
  [stem('primeira'), 5],
  [stem('persistencia'), 4],
  ['devopsx', 1],
]);

describe('buildQuery', () => {
  it('when every word exists in the pages, should keep each one as is with full weight', () => {
    const query = buildQuery('primeira maneira', vocabulary);

    expect(query).toEqual([
      { alternatives: [{ term: stem('primeira'), weight: 1 }] },
      { alternatives: [{ term: stem('maneira'), weight: 1 }] },
    ]);
  });

  it('when the question has filler words, should ignore them', () => {
    expect(buildQuery('o que diz a primeira maneira do devops', vocabulary)).toHaveLength(3);
  });

  it('when a word has a typo, should offer the closest word that exists in the pages', () => {
    const [term] = buildQuery('devosp', vocabulary);

    expect(term.alternatives[0].term).toBe(stem('devops'));
    expect(term.alternatives[0].weight).toBeLessThan(1);
  });

  it('when a word is only the beginning of another, should offer the full word', () => {
    const [term] = buildQuery('persi', vocabulary);

    expect(term.alternatives.map((alt) => alt.term)).toContain(stem('persistencia'));
  });

  it('when several corrections exist, should offer at most three, closest first', () => {
    const crowded = new Map<string, number>([
      ['fluxoa', 1],
      ['fluxob', 2],
      ['fluxoc', 3],
      ['fluxod', 4],
      ['fluxoe', 5],
    ]);

    const [term] = buildQuery('fluxo', crowded);

    expect(term.alternatives).toHaveLength(3);
  });

  it('when nothing is close, should leave the word with no alternatives', () => {
    const [term] = buildQuery('zzzzzzzz', vocabulary);

    expect(term.alternatives).toEqual([]);
  });

  it('when the word is very short and unknown, should not guess', () => {
    const [term] = buildQuery('xyz', vocabulary);

    expect(term.alternatives).toEqual([]);
  });

  it('when the question is only filler words, should return no terms', () => {
    expect(buildQuery('o que é isso', vocabulary)).toEqual([]);
  });
});
