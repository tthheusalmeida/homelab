import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import type { CategoryNode } from '../types/library.types';

import { CategoryTree, type TreePage } from './CategoryTree';

const leaf = (name: string, path: string[]): CategoryNode => ({
  name,
  path,
  count: 1,
  children: [],
});

const tree: CategoryNode[] = [
  {
    name: 'Tecnologia',
    path: ['Tecnologia'],
    count: 4,
    children: [
      leaf('Docker', ['Tecnologia', 'Docker']),
      {
        name: 'Redes',
        path: ['Tecnologia', 'Redes'],
        count: 1,
        children: [leaf('Wi-Fi', ['Tecnologia', 'Redes', 'Wi-Fi'])],
      },
    ],
  },
  leaf('Culinária', ['Culinária']),
];
const pages: TreePage[] = [
  { id: 'p1', title: 'Algoritmos', category: ['Tecnologia'] },
  { id: 'p2', title: 'Bolo', category: ['Culinária'] },
];

const lines = (container: HTMLElement) =>
  Array.from(container.querySelectorAll<HTMLElement>('[data-branch]'));
const open = (selected: string[]) =>
  render(<CategoryTree nodes={tree} selected={selected} onSelect={() => {}} pages={pages} />);

describe('CategoryTree: traço de ligação com curva no último', () => {
  it('when a level is open, should draw a line for each item of it and none for the first level', () => {
    const { container } = open(['Culinária']);

    // só o nível de dentro de Culinária (a página "Bolo")
    expect(lines(container)).toHaveLength(1);
    expect(container.querySelector('nav > ul > li > [data-branch]')).toBeNull();
  });

  it('when a level has several items, should draw straight lines for the middle ones and the curve for the last', () => {
    const { container } = open(['Tecnologia']);

    // dentro de Tecnologia: Docker, Redes e a página Algoritmos (as pastas vêm antes)
    expect(lines(container).map((line) => line.dataset.branch)).toEqual([
      'middle',
      'middle',
      'last',
    ]);
  });

  it('when the item is in the middle, should draw a line down the whole height of it', () => {
    const { container } = open(['Tecnologia']);
    const [first] = lines(container);

    expect(first).toHaveClass('inset-y-0', 'border-l');
    expect(first).not.toHaveClass('border-b');
    expect(first).not.toHaveClass('rounded-bl-md');
  });

  it('when the item is the last one, should end the line in a curve at the middle of its row', () => {
    const { container } = open(['Tecnologia']);
    const last = lines(container)[2];

    expect(last).toHaveClass('top-0', 'h-4', 'w-1.5', 'border-l', 'border-b', 'rounded-bl-md');
    expect(last).not.toHaveClass('inset-y-0');
  });

  it('when the last item is a page, should be the page that gets the curve (pages come after the folders)', () => {
    const { container } = open(['Tecnologia']);
    const last = lines(container)[2];

    expect(last.parentElement).toHaveTextContent('Algoritmos');
  });

  it('when there are no pages, should be the last folder that gets the curve', () => {
    const { container } = render(
      <CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />,
    );
    const all = lines(container);

    expect(all.map((line) => line.dataset.branch)).toEqual(['middle', 'last']);
    expect(all[1].parentElement).toHaveTextContent('Redes');
  });

  it('when the last item is a folder with its own subfolders, should cut its line at the row and not run it through them', () => {
    const { container } = render(
      <CategoryTree nodes={tree} selected={['Tecnologia', 'Redes']} onSelect={() => {}} />,
    );
    const redes = lines(container).find((line) =>
      line.parentElement?.textContent?.startsWith('Redes'),
    );

    expect(redes?.dataset.branch).toBe('last');
    expect(redes).toHaveClass('h-4');
    // e o que está dentro dela tem o próprio traço (um filho só: a curva)
    expect(lines(container).map((line) => line.dataset.branch)).toEqual(['middle', 'last', 'last']);
  });

  it('when only one item is inside, should draw just the curve', () => {
    const { container } = open(['Culinária']);

    expect(lines(container).map((line) => line.dataset.branch)).toEqual(['last']);
  });

  it('when drawing the lines, should be decoration only (hidden from screen readers and not clickable)', () => {
    const { container } = open(['Tecnologia']);

    for (const line of lines(container)) {
      expect(line).toHaveAttribute('aria-hidden', 'true');
      expect(line).toHaveClass('pointer-events-none');
    }
  });

  it('when a level is open, should not keep the old dashed line on the list', () => {
    const { container } = open(['Tecnologia']);
    const nested = container.querySelector('li ul') as HTMLElement;

    expect(nested).not.toHaveClass('border-l');
    expect(nested).not.toHaveClass('border-dashed');
    expect(nested).toHaveClass('ml-2.5');
  });

  it('when an item has a line, should leave a small space for it before its content', () => {
    const { container } = open(['Culinária']);

    expect(lines(container)[0].parentElement).toHaveClass('relative', 'pl-1.5');
  });
});
