import { describe, expect, it } from 'vitest';

import { INFOGRAPHIC_PIECES } from '#shared/infographic-pieces';

import { createPieceMatcher, normalizeSearch } from './piece-search';

const find = (query: string) => INFOGRAPHIC_PIECES.filter(createPieceMatcher(query));
const keys = (query: string) => find(query).map((piece) => piece.key);

describe('createPieceMatcher', () => {
  it('when the search is empty or only spaces, should let every piece through', () => {
    expect(find('')).toHaveLength(INFOGRAPHIC_PIECES.length);
    expect(find('   ')).toHaveLength(INFOGRAPHIC_PIECES.length);
  });

  it('when the text is in the name, should find the piece (ignoring accents and capitals)', () => {
    expect(keys('CÁLCULADORA')).toContain('financas.calculadora');
  });

  it('when the text is in the key, a keyword or the theme, should find the piece', () => {
    expect(keys('financas.calc')).toContain('financas.calculadora');
    expect(keys('automóvel')).toContain('transporte.carro');
    expect(find('proteção').length).toBeGreaterThan(10);
  });

  it('when the word is only a synonym of a keyword, should still find the piece', () => {
    // nenhuma peça tem "grana" no texto: vem da tabela de sinônimos ("dinheiro")
    expect(find('grana').length).toBeGreaterThan(0);
    expect(keys('grana')).toContain('financas.moedas');
  });

  it('when the word is a plural of a synonym, should find it too', () => {
    expect(keys('automóveis')).toContain('transporte.carro');
  });

  it('when only part of the typed words are known, should require every one of them', () => {
    expect(keys('grana palavraquenaoexiste')).toEqual([]);
  });

  it('when the word is very short, should only search by piece of text (no synonyms)', () => {
    expect(find('pc').every((piece) => /pc/.test(normalizeSearch(JSON.stringify(piece))))).toBe(
      true,
    );
  });

  it('when nothing matches, should find nothing', () => {
    expect(find('xyzzy')).toEqual([]);
  });

  it('when searching the whole bank, should stay fast (the index is built once)', () => {
    createPieceMatcher('aquecimento')(INFOGRAPHIC_PIECES[0]);

    const start = performance.now();

    for (let i = 0; i < 50; i += 1) {
      INFOGRAPHIC_PIECES.filter(createPieceMatcher('dinheiro e grana'));
    }

    expect((performance.now() - start) / 50).toBeLessThan(20);
  });
});
