import {
  INFOGRAPHIC_LAYOUT_IDS,
  INFOGRAPHIC_LAYOUTS,
  isInfographicLayoutId,
  layoutInfo,
} from './infographic-layouts';
import {
  INFOGRAPHIC_PIECE_KEYS,
  INFOGRAPHIC_PIECES,
  INFOGRAPHIC_THEMES,
} from './infographic-pieces';

describe('catálogo de peças do infográfico', () => {
  it('when listing the pieces, should have unique keys that start with their theme', () => {
    expect(INFOGRAPHIC_PIECE_KEYS.size).toBe(INFOGRAPHIC_PIECES.length);

    for (const piece of INFOGRAPHIC_PIECES) {
      expect(piece.key.startsWith(`${piece.theme}.`)).toBe(true);
    }
  });

  it('when counting by theme, should have at least ten pieces in each of the 20 themes', () => {
    const themes = Object.keys(INFOGRAPHIC_THEMES).filter((theme) => theme !== 'generico');

    expect(themes).toHaveLength(20);

    for (const theme of themes) {
      expect(
        INFOGRAPHIC_PIECES.filter((piece) => piece.theme === theme).length,
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it('when the first batch of new pieces was added, should have twenty pieces in Tecnologia, Finanças, Saúde and Educação', () => {
    for (const theme of ['tecnologia', 'financas', 'saude', 'educacao']) {
      expect(INFOGRAPHIC_PIECES.filter((piece) => piece.theme === theme)).toHaveLength(20);
    }
  });

  it('when the same piece is the only one for a word, should not hide it behind another with the same name', () => {
    const names = INFOGRAPHIC_PIECES.map((piece) => piece.name.toLowerCase());

    expect(new Set(names).size).toBe(names.length);
  });

  it('when listing the generic pieces, should have some to combine with the theme ones', () => {
    expect(INFOGRAPHIC_PIECES.filter((piece) => piece.theme === 'generico').length).toBeGreaterThan(
      10,
    );
  });

  it('when reading a piece, should have a name and tags the AI can search', () => {
    for (const piece of INFOGRAPHIC_PIECES) {
      expect(piece.name.trim()).not.toBe('');
      expect(piece.tags.trim()).not.toBe('');
    }
  });
});

describe('modelos de infográfico', () => {
  it('when listing the layouts, should describe every id once, with a valid range of items', () => {
    expect(INFOGRAPHIC_LAYOUTS.map((layout) => layout.id)).toEqual([...INFOGRAPHIC_LAYOUT_IDS]);

    for (const layout of INFOGRAPHIC_LAYOUTS) {
      expect(layout.minItems).toBeGreaterThan(0);
      expect(layout.maxItems).toBeGreaterThanOrEqual(layout.minItems);
    }
  });

  it('when checking an id, should accept only the known layouts', () => {
    expect(isInfographicLayoutId('steps')).toBe(true);
    expect(isInfographicLayoutId('pizza')).toBe(false);
    expect(isInfographicLayoutId(undefined)).toBe(false);
  });

  it('when asking for the info of an unknown layout, should throw', () => {
    expect(() => layoutInfo('nada' as never)).toThrow('Modelo de infográfico desconhecido');
  });
});
