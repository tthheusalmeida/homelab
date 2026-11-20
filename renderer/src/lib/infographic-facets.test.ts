import { describe, expect, it } from 'vitest';

import { facetsOf, seedOf } from './infographic-facets';

describe('seedOf', () => {
  it('when the text is the same, should give the same seed', () => {
    expect(seedOf('jogos.controle')).toBe(seedOf('jogos.controle'));
  });

  it('when the text differs, should give a different seed', () => {
    expect(seedOf('jogos.controle')).not.toBe(seedOf('jogos.dado'));
  });
});

describe('facetsOf', () => {
  it('when the seed is the same, should draw exactly the same facets', () => {
    expect(facetsOf(seedOf('saude.cruz'))).toEqual(facetsOf(seedOf('saude.cruz')));
  });

  it('when the seed differs, should draw different facets', () => {
    expect(facetsOf(1)).not.toEqual(facetsOf(2));
  });

  it('when drawing the default grid, should have two triangles for each of the 5 x 5 cells', () => {
    expect(facetsOf(7)).toHaveLength(50);
    expect(facetsOf(7, 3)).toHaveLength(18);
  });

  it('when reading a facet, should have three vertices and a subtle opacity', () => {
    for (const facet of facetsOf(11)) {
      expect(facet.points.split(' ')).toHaveLength(3);
      expect(facet.opacity).toBeGreaterThanOrEqual(0.03);
      expect(facet.opacity).toBeLessThanOrEqual(0.2);
    }
  });

  it('when reading every vertex, should stay inside the 100 x 100 drawing area', () => {
    for (const facet of facetsOf(13)) {
      for (const vertex of facet.points.split(' ')) {
        const [x, y] = vertex.split(',').map(Number);

        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
      }
    }
  });

  it('when drawing many facets, should mix light and dark ones', () => {
    const facets = facetsOf(17);

    expect(facets.some((facet) => facet.light)).toBe(true);
    expect(facets.some((facet) => !facet.light)).toBe(true);
  });
});
