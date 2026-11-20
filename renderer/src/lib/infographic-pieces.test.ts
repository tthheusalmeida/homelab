import { describe, expect, it } from 'vitest';

import { INFOGRAPHIC_PIECES, INFOGRAPHIC_PIECE_KEYS } from '#shared/infographic-pieces';

import { INFOGRAPHIC_PIECE_SHAPES, type Shape } from './infographic-pieces';

/** Todos os números de uma forma (inclusive das formas aninhadas). */
function numbersOf(shape: Shape): number[] {
  switch (shape[0]) {
    case 'r':
      return [shape[1], shape[2], shape[3], shape[4], shape[6]];
    case 'c':
      return [shape[1], shape[2], shape[3]];
    case 'e':
      return [shape[1], shape[2], shape[3], shape[4]];
    case 'g':
      return shape[1];
    case 'a':
    case 'k':
      return [];
    case 'l':
      return [shape[1], shape[2], shape[3], shape[4], shape[6]];
    case 'o':
      return [shape[1], shape[2], shape[3], shape[5]];
    case 'q':
      return [shape[1], shape[2], shape[3], shape[4], shape[6]];
    case 'T':
      return [shape[1], shape[2], shape[3], ...shape[4].flatMap(numbersOf)];
  }
}

/** Os tons de uma forma (inclusive das formas aninhadas). */
function toneOf(shape: Shape): string[] {
  switch (shape[0]) {
    case 'r':
    case 'e':
    case 'l':
    case 'q':
      return [shape[5]];
    case 'c':
    case 'o':
      return [shape[4]];
    case 'g':
    case 'a':
    case 'k':
      return [shape[2]];
    case 'T':
      return shape[4].flatMap(toneOf);
  }
}

describe('banco de peças do infográfico', () => {
  it('when comparing with the catalog the AI sees, should have exactly the same keys', () => {
    expect(INFOGRAPHIC_PIECE_SHAPES.map((piece) => piece.key).sort()).toEqual(
      INFOGRAPHIC_PIECES.map((piece) => piece.key).sort(),
    );
  });

  it('when comparing names and tags with the catalog, should match for every piece', () => {
    for (const piece of INFOGRAPHIC_PIECE_SHAPES) {
      const info = INFOGRAPHIC_PIECES.find((candidate) => candidate.key === piece.key);

      expect(info).toMatchObject({ name: piece.name, tags: piece.tags, theme: piece.theme });
    }
  });

  it('when listing the keys, should not repeat any', () => {
    expect(new Set(INFOGRAPHIC_PIECE_SHAPES.map((piece) => piece.key)).size).toBe(
      INFOGRAPHIC_PIECE_SHAPES.length,
    );
    expect(INFOGRAPHIC_PIECE_KEYS.size).toBe(INFOGRAPHIC_PIECE_SHAPES.length);
  });

  it('when reading each piece, should have shapes with finite numbers (no NaN from a drawing mistake)', () => {
    for (const piece of INFOGRAPHIC_PIECE_SHAPES) {
      expect(piece.shapes.length).toBeGreaterThan(0);

      for (const shape of piece.shapes) {
        for (const value of numbersOf(shape)) {
          expect(Number.isFinite(value)).toBe(true);
        }
      }
    }
  });

  it('when reading each piece, should keep its main points inside the 100 x 100 drawing area', () => {
    for (const piece of INFOGRAPHIC_PIECE_SHAPES) {
      for (const shape of piece.shapes) {
        if (shape[0] === 'g') {
          for (const value of shape[1]) {
            expect(value).toBeGreaterThanOrEqual(-5);
            expect(value).toBeLessThanOrEqual(105);
          }
        }
      }
    }
  });

  it('when reading each piece, should only use the known tones and a valid box', () => {
    const tones = new Set(['b', 'B', 's', 'n', 'N', 'd', 'w']);

    for (const piece of INFOGRAPHIC_PIECE_SHAPES) {
      for (const tone of piece.shapes.flatMap(toneOf)) {
        expect(tones.has(tone)).toBe(true);
      }

      expect(piece.box).toHaveLength(4);
      expect(piece.box[2]).toBeGreaterThan(0);
      expect(piece.box[3]).toBeGreaterThan(0);
    }
  });

  it('when reading each piece, should have at least one shape that is not a light highlight', () => {
    for (const piece of INFOGRAPHIC_PIECE_SHAPES) {
      expect(piece.shapes.flatMap(toneOf).some((tone) => tone !== 'w')).toBe(true);
    }
  });
});
