import { describe, expect, it } from 'vitest';

import { followRenamedCategory } from './categories';

describe('followRenamedCategory', () => {
  it('when the selected category is the one renamed, should select the new path', () => {
    expect(followRenamedCategory(['Tecnologia'], ['Tecnologia'], ['TI'])).toEqual(['TI']);
  });

  it('when the selected category is inside the renamed one, should keep the levels below', () => {
    expect(
      followRenamedCategory(['Tecnologia', 'Containers', 'Docker'], ['Tecnologia'], ['TI']),
    ).toEqual(['TI', 'Containers', 'Docker']);
  });

  it('when the path changes depth, should rebuild the selection under the new path', () => {
    expect(followRenamedCategory(['A', 'B'], ['A'], ['X', 'Y'])).toEqual(['X', 'Y', 'B']);
  });

  it('when the names differ only by capitals or accents, should still follow', () => {
    expect(followRenamedCategory(['música'], ['Musica'], ['Som'])).toEqual(['Som']);
  });

  it('when another category is selected, should leave it alone', () => {
    expect(followRenamedCategory(['Culinária'], ['Tecnologia'], ['TI'])).toEqual(['Culinária']);
  });

  it('when a parent of the renamed category is selected, should leave it alone', () => {
    expect(
      followRenamedCategory(['Tecnologia'], ['Tecnologia', 'IA'], ['Tecnologia', 'ML']),
    ).toEqual(['Tecnologia']);
  });

  it('when nothing is selected (all categories), should stay that way', () => {
    expect(followRenamedCategory([], ['Tecnologia'], ['TI'])).toEqual([]);
  });
});
