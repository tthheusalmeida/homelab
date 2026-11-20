import { describe, expect, it } from 'vitest';

import type { LibraryInfographic } from '#shared/contracts/library';

import { isDraftDirty, pieceAt, toSaveInput, withPiece } from './infographic-edit';

const base: LibraryInfographic = {
  title: 'Redes',
  piece: 'tecnologia.wifi',
  sections: [
    {
      layout: 'steps',
      title: 'Passos',
      piece: 'tecnologia.chip',
      items: [
        { piece: 'tecnologia.chip', title: 'A', text: 'a' },
        { piece: 'tecnologia.nuvem', title: 'B', text: 'b' },
        { piece: 'tecnologia.servidor', title: 'C', text: 'c' },
      ],
    },
    {
      layout: 'versus',
      title: 'A ou B',
      piece: '',
      sides: [
        { piece: 'financas.cartao', title: 'Cartão' },
        { piece: 'financas.carteira', title: 'Dinheiro' },
      ],
      items: [{ piece: '', title: 'Custo', text: 'x', extra: 'y' }],
    },
  ],
  model: 'gemini-x',
  createdAt: '2026-11-20T10:00:00.000Z',
  stale: false,
};

describe('pieceAt', () => {
  it('when reading the cover, should answer the piece of the infographic', () => {
    expect(pieceAt(base, { section: null, part: 'piece' })).toBe('tecnologia.wifi');
  });

  it('when reading the piece of a section, should answer it', () => {
    expect(pieceAt(base, { section: 0, part: 'piece' })).toBe('tecnologia.chip');
  });

  it('when reading an item, should answer its piece', () => {
    expect(pieceAt(base, { section: 0, part: 'item', index: 1 })).toBe('tecnologia.nuvem');
  });

  it('when reading a side of the comparison, should answer its piece', () => {
    expect(pieceAt(base, { section: 1, part: 'side', index: 1 })).toBe('financas.carteira');
  });

  it.each([
    ['a section that does not exist', { section: 9, part: 'piece' as const }],
    ['an item that does not exist', { section: 0, part: 'item' as const, index: 9 }],
    ['a side in a section without sides', { section: 0, part: 'side' as const, index: 0 }],
  ])('when reading %s, should answer an empty piece', (_name, target) => {
    expect(pieceAt(base, target)).toBe('');
  });
});

describe('withPiece', () => {
  it('when swapping the cover piece, should change only it', () => {
    const next = withPiece(base, { section: null, part: 'piece' }, 'saude.cruz');

    expect(next.piece).toBe('saude.cruz');
    expect(next.sections).toBe(base.sections);
  });

  it('when swapping the piece of a section, should change only it', () => {
    const next = withPiece(base, { section: 0, part: 'piece' }, 'saude.cruz');

    expect(next.sections[0].piece).toBe('saude.cruz');
    expect(next.sections[0].items).toBe(base.sections[0].items);
    expect(next.sections[1]).toBe(base.sections[1]);
  });

  it('when swapping an item, should change only that item', () => {
    const next = withPiece(base, { section: 0, part: 'item', index: 1 }, 'saude.cruz');

    expect(next.sections[0].items.map((item) => item.piece)).toEqual([
      'tecnologia.chip',
      'saude.cruz',
      'tecnologia.servidor',
    ]);
    expect(next.sections[0].items[1]).toMatchObject({ title: 'B', text: 'b' });
  });

  it('when swapping a side of the comparison, should change only that side', () => {
    const next = withPiece(base, { section: 1, part: 'side', index: 0 }, 'saude.cruz');

    expect(next.sections[1].sides?.map((side) => side.piece)).toEqual([
      'saude.cruz',
      'financas.carteira',
    ]);
    expect(next.sections[1].sides?.[0].title).toBe('Cartão');
  });

  it('when swapping, should never change the original infographic', () => {
    const copy = structuredClone(base);

    withPiece(base, { section: 0, part: 'item', index: 0 }, 'saude.cruz');
    withPiece(base, { section: null, part: 'piece' }, 'saude.cruz');

    expect(base).toEqual(copy);
  });

  it('when the place does not exist, should answer the same infographic', () => {
    expect(withPiece(base, { section: 9, part: 'piece' }, 'saude.cruz')).toBe(base);
  });

  it('when a section has no sides and a side is swapped, should keep it without sides', () => {
    const next = withPiece(base, { section: 0, part: 'side', index: 0 }, 'saude.cruz');

    expect(next.sections[0].sides).toBeUndefined();
  });
});

describe('toSaveInput', () => {
  it('when preparing to save, should leave out what the server takes care of', () => {
    const input = toSaveInput({ ...base, edited: true });

    expect(input).not.toHaveProperty('model');
    expect(input).not.toHaveProperty('createdAt');
    expect(input).not.toHaveProperty('stale');
    expect(input).not.toHaveProperty('edited');
    expect(input.title).toBe('Redes');
    expect(input.sections).toBe(base.sections);
  });
});

describe('isDraftDirty', () => {
  it('when nothing changed, should not be dirty', () => {
    expect(isDraftDirty(structuredClone(base), base)).toBe(false);
  });

  it('when a piece changed, should be dirty', () => {
    expect(
      isDraftDirty(withPiece(base, { section: 0, part: 'item', index: 0 }, 'saude.cruz'), base),
    ).toBe(true);
  });

  it('when the piece was swapped and swapped back, should not be dirty', () => {
    const swapped = withPiece(base, { section: 0, part: 'item', index: 0 }, 'saude.cruz');
    const back = withPiece(swapped, { section: 0, part: 'item', index: 0 }, 'tecnologia.chip');

    expect(isDraftDirty(back, base)).toBe(false);
  });

  it('when only the model or the date differ, should not be dirty', () => {
    expect(isDraftDirty({ ...base, model: 'outro', createdAt: 'outra' }, base)).toBe(false);
  });
});
