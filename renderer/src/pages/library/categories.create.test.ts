import { describe, expect, it } from 'vitest';

import { parseCategoryNames, placesForNew } from './categories';
import type { CategoryNode } from './types/library.types';

const node = (name: string, path: string[], children: CategoryNode[] = []): CategoryNode => ({
  name,
  path,
  count: 0,
  children,
});

describe('parseCategoryNames', () => {
  it.each([
    ['Redes', ['Redes']],
    ['Redes / Segurança / Firewall', ['Redes', 'Segurança', 'Firewall']],
    ['Redes/Segurança', ['Redes', 'Segurança']],
    ['Redes › Segurança', ['Redes', 'Segurança']],
    ['Redes > Segurança', ['Redes', 'Segurança']],
    ['  Redes  ', ['Redes']],
    ['Redes / / Firewall', ['Redes', 'Firewall']],
    ['', []],
    ['  /  ', []],
  ])('when the text is %j, should read %j', (text, expected) => {
    expect(parseCategoryNames(text)).toEqual(expected);
  });
});

describe('placesForNew', () => {
  it('when listing places to create, should start with the main level and skip categories already at 4 levels', () => {
    const tree = [
      node(
        'A',
        ['A'],
        [node('B', ['A', 'B'], [node('C', ['A', 'B', 'C'], [node('D', ['A', 'B', 'C', 'D'])])])],
      ),
    ];

    expect(placesForNew(tree, 'Raiz').map((place) => place.label)).toEqual([
      'Raiz',
      'A',
      'A › B',
      'A › B › C',
    ]);
  });

  it('when there are no categories, should offer only the main level', () => {
    expect(placesForNew([], 'Raiz')).toEqual([{ path: [], label: 'Raiz' }]);
  });
});
