import { describe, expect, it } from 'vitest';

import {
  canMoveInto,
  categoryDepth,
  findCategory,
  MAX_CATEGORY_LEVELS,
  pathInside,
  placesFor,
  startsWithPath,
} from './categories';
import type { CategoryNode } from './types/library.types';

const node = (name: string, path: string[], children: CategoryNode[] = []): CategoryNode => ({
  name,
  path,
  count: 1,
  children,
});

const docker = node('Docker', ['Tecnologia', 'Containers', 'Docker']);
const containers = node('Containers', ['Tecnologia', 'Containers'], [docker]);
const tecnologia = node('Tecnologia', ['Tecnologia'], [containers]);
const culinaria = node('Culinária', ['Culinária']);
const tree = [tecnologia, culinaria];

describe('findCategory', () => {
  it('when the path exists, should find it (ignoring capitals and accents)', () => {
    expect(findCategory(tree, ['tecnologia', 'CONTAINERS'])).toBe(containers);
    expect(findCategory(tree, ['culinaria'])).toBe(culinaria);
  });

  it('when the path does not exist or is empty, should answer nothing', () => {
    expect(findCategory(tree, ['Tecnologia', 'Nada'])).toBeUndefined();
    expect(findCategory(tree, [])).toBeUndefined();
  });
});

describe('categoryDepth', () => {
  it('when counting levels, should include the deepest subcategory', () => {
    expect(categoryDepth(culinaria)).toBe(1);
    expect(categoryDepth(containers)).toBe(2);
    expect(categoryDepth(tecnologia)).toBe(3);
  });
});

describe('startsWithPath', () => {
  it('when the path begins with the prefix, should say yes (the whole path counts)', () => {
    expect(startsWithPath(['A', 'B'], ['a'])).toBe(true);
    expect(startsWithPath(['A', 'B'], ['A', 'B'])).toBe(true);
    expect(startsWithPath(['A'], ['A', 'B'])).toBe(false);
    expect(startsWithPath(['A', 'B'], ['B'])).toBe(false);
  });
});

describe('pathInside', () => {
  it('when moving inside a place, should put the name last', () => {
    expect(pathInside(docker, ['Culinária'])).toEqual(['Culinária', 'Docker']);
    expect(pathInside(docker, [])).toEqual(['Docker']);
    expect(pathInside(docker, ['Culinária'], 'Cozinha')).toEqual(['Culinária', 'Cozinha']);
  });
});

describe('canMoveInto', () => {
  it('when the place is another category with room, should allow', () => {
    expect(canMoveInto(docker, ['Culinária'])).toBe(true);
    expect(canMoveInto(docker, [])).toBe(true);
  });

  it('when it would stay where it is, should not allow', () => {
    expect(canMoveInto(docker, ['Tecnologia', 'Containers'])).toBe(false);
    expect(canMoveInto(culinaria, [])).toBe(false);
  });

  it('when the place is itself or inside itself, should not allow', () => {
    expect(canMoveInto(tecnologia, ['Tecnologia'])).toBe(false);
    expect(canMoveInto(tecnologia, ['Tecnologia', 'Containers'])).toBe(false);
  });

  it('when a subcategory would pass the limit, should not allow', () => {
    const four = node(
      'A',
      ['A'],
      [node('B', ['A', 'B'], [node('C', ['A', 'B', 'C'], [node('D', ['A', 'B', 'C', 'D'])])])],
    );

    expect(categoryDepth(four)).toBe(MAX_CATEGORY_LEVELS);
    expect(canMoveInto(four, ['Culinária'])).toBe(false);
    expect(canMoveInto(four.children[0], [])).toBe(true);
  });

  it('when only the name changes in the same place, should allow only if it really differs', () => {
    expect(canMoveInto(docker, ['Tecnologia', 'Containers'], 'Conteiner')).toBe(true);
    expect(canMoveInto(docker, ['Tecnologia', 'Containers'], 'docker')).toBe(false);
  });
});

describe('placesFor', () => {
  it('when listing places for a category, should start with the main level and skip itself and what is inside it', () => {
    expect(placesFor(containers, tree, 'Nenhuma').map((place) => place.label)).toEqual([
      'Nenhuma',
      'Tecnologia',
      'Culinária',
    ]);
  });

  it('when the category has subcategories, should leave out places that would make them too deep', () => {
    const place = (target: CategoryNode) => placesFor(tecnologia, [tecnologia, target], 'Raiz');
    const deepTarget = node('X', ['X'], [node('Y', ['X', 'Y'], [node('Z', ['X', 'Y', 'Z'])])]);

    // Tecnologia tem 3 níveis: dentro de X (1 nível) ficaria com 4; dentro de X > Y (2) com 5
    expect(place(deepTarget).map((entry) => entry.label)).toEqual(['Raiz', 'X']);
  });

  it('when the label has a path, should join the levels with an arrow', () => {
    expect(placesFor(culinaria, tree, 'Raiz').map((place) => place.label)).toContain(
      'Tecnologia › Containers',
    );
  });
});
