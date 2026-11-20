import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CategoryNode } from '../types/library.types';

import { CategoryTree, type TreePage } from './CategoryTree';

const docker: CategoryNode = {
  name: 'Docker',
  path: ['Tecnologia', 'Docker'],
  count: 1,
  children: [],
};
const tree: CategoryNode[] = [
  { name: 'Tecnologia', path: ['Tecnologia'], count: 3, children: [docker] },
  { name: 'Culinária', path: ['Culinária'], count: 1, children: [] },
  { name: 'Vazia', path: ['Vazia'], count: 0, children: [] },
];
const pages: TreePage[] = [
  { id: 'p2', title: 'Redes de computadores', category: ['Tecnologia'] },
  { id: 'p1', title: 'Algoritmos', category: ['Tecnologia'] },
  { id: 'p3', title: 'Compose', category: ['Tecnologia', 'Docker'] },
  { id: 'p4', title: 'Bolo de cenoura', category: ['Culinária'] },
];

const transfer = () => ({ setData: vi.fn(), effectAllowed: '', dropEffect: '' });
const row = (name: RegExp | string) =>
  screen.getByRole('button', { name }).parentElement as HTMLElement;
const rootDrop = () =>
  screen.getByRole('button', { name: 'Todas as categorias' }).parentElement as HTMLElement;

function drag(from: HTMLElement, to: HTMLElement) {
  const data = transfer();

  fireEvent.dragStart(from, { dataTransfer: data });
  fireEvent.dragOver(to, { dataTransfer: data });
  fireEvent.drop(to, { dataTransfer: data });
}

describe('CategoryTree: páginas como arquivos', () => {
  it('when a category is open, should show its pages inside it, after the subcategories, in alphabetical order', () => {
    render(
      <CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} pages={pages} />,
    );

    const names = screen
      .getAllByRole('button')
      .map((button) => button.textContent ?? '')
      .filter((text) => /Docker|Algoritmos|Redes de/.test(text));

    expect(names).toEqual(['Docker1', 'Algoritmos', 'Redes de computadores']);
  });

  it('when a category is closed, should not show its pages', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} pages={pages} />);

    expect(screen.queryByRole('button', { name: 'Algoritmos' })).not.toBeInTheDocument();
  });

  it('when the category is opened with its arrow, should reveal the pages', async () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} pages={pages} />);

    await userEvent.click(screen.getByRole('button', { name: 'Expandir Culinária' }));

    expect(screen.getByRole('button', { name: 'Bolo de cenoura' })).toBeInTheDocument();
  });

  it('when a category has only pages, should offer the arrow and draw a filled hexagon', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} pages={pages} />);

    expect(screen.getByRole('button', { name: 'Expandir Culinária' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Culinária/ }).querySelector('[class*="clip-path"]'),
    ).toHaveClass('bg-muted-foreground');
  });

  it('when a category has no pages and no subcategories, should keep it as a faded empty one', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} pages={pages} />);

    expect(screen.queryByRole('button', { name: 'Expandir Vazia' })).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Vazia/ }).querySelector('[class*="clip-path"]'),
    ).toHaveClass('bg-muted-foreground/35');
  });

  it('when drawing a page, should look different from a folder: document icon, lighter text, no count', () => {
    render(
      <CategoryTree nodes={tree} selected={['Culinária']} onSelect={() => {}} pages={pages} />,
    );

    const page = screen.getByRole('button', { name: 'Bolo de cenoura' });
    const folder = screen.getByRole('button', { name: /^Culinária/ });

    expect(page.querySelector('svg')).not.toBeNull();
    expect(page.querySelector('[class*="clip-path"]')).toBeNull();
    expect(page.querySelector('.font-mono')).toBeNull();
    expect(page).toHaveClass('font-normal', 'text-muted-foreground');
    expect(folder).toHaveClass('font-medium');
    expect((folder.parentElement as HTMLElement).querySelector('.font-mono')).toHaveTextContent(
      '1',
    );
  });

  it('when a page is clicked, should open it and not select any category', async () => {
    const onOpenPage = vi.fn();
    const onSelect = vi.fn();

    render(
      <CategoryTree
        nodes={tree}
        selected={['Culinária']}
        onSelect={onSelect}
        pages={pages}
        onOpenPage={onOpenPage}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Bolo de cenoura' }));

    expect(onOpenPage).toHaveBeenCalledWith(pages[3]);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('CategoryTree: arrastar páginas', () => {
  const setup = (extra: Partial<Parameters<typeof CategoryTree>[0]> = {}) => {
    const onMovePage = vi.fn();
    const onMove = vi.fn();

    render(
      <CategoryTree
        nodes={tree}
        selected={['Tecnologia']}
        onSelect={() => {}}
        pages={pages}
        onMovePage={onMovePage}
        onMove={onMove}
        {...extra}
      />,
    );

    return { onMovePage, onMove };
  };

  it('when a page is dropped on another category, should move it there', () => {
    const { onMovePage, onMove } = setup();

    drag(row('Algoritmos'), row(/^Culinária/));

    expect(onMovePage).toHaveBeenCalledWith(pages[1], ['Culinária']);
    expect(onMove).not.toHaveBeenCalled();
  });

  it('when a page is dropped on a subcategory, should move it there', () => {
    const { onMovePage } = setup();

    drag(row('Algoritmos'), row(/^Docker/));

    expect(onMovePage).toHaveBeenCalledWith(pages[1], ['Tecnologia', 'Docker']);
  });

  it('when a page is dropped on an empty category, should move it there', () => {
    const { onMovePage } = setup();

    drag(row('Algoritmos'), row(/^Vazia/));

    expect(onMovePage).toHaveBeenCalledWith(pages[1], ['Vazia']);
  });

  it('when a page is dropped on the category it is already in, should do nothing', () => {
    const { onMovePage } = setup();

    drag(row('Algoritmos'), row(/^Tecnologia/));

    expect(onMovePage).not.toHaveBeenCalled();
  });

  it('when a page is dropped on "Todas as categorias", should do nothing (a page always has a category)', () => {
    const { onMovePage } = setup();

    drag(row('Algoritmos'), rootDrop());

    expect(onMovePage).not.toHaveBeenCalled();
  });

  it('when a page is dropped on a category, should open that category to show what arrived', () => {
    setup({ pages: [...pages, { id: 'p5', title: 'Pudim', category: ['Culinária'] }] });

    expect(screen.queryByRole('button', { name: 'Pudim' })).not.toBeInTheDocument();

    drag(row('Algoritmos'), row(/^Culinária/));

    expect(screen.getByRole('button', { name: 'Pudim' })).toBeInTheDocument();
  });

  it('when a page is dragged, should say where to drop it and highlight the target', () => {
    setup();

    const data = transfer();

    fireEvent.dragStart(row('Algoritmos'), { dataTransfer: data });
    fireEvent.dragOver(row(/^Culinária/), { dataTransfer: data });

    expect(screen.getByRole('status')).toHaveTextContent('Solte em uma categoria');
    expect(row(/^Culinária/)).toHaveClass('ring-primary');
    expect(row('Algoritmos')).toHaveClass('opacity-50');
  });

  it('when a category is dragged, should keep moving categories as before', () => {
    const { onMove, onMovePage } = setup();

    drag(row(/^Docker/), rootDrop());

    expect(onMove).toHaveBeenCalledWith(docker, []);
    expect(onMovePage).not.toHaveBeenCalled();
  });

  it('when only pages can move, should not make the categories draggable', () => {
    setup({ onMove: undefined });

    expect(row(/^Culinária/)).toHaveAttribute('draggable', 'false');
    expect(row('Algoritmos')).toHaveAttribute('draggable', 'true');
  });

  it('when only categories can move, should not make the pages draggable', () => {
    setup({ onMovePage: undefined });

    expect(row('Algoritmos')).toHaveAttribute('draggable', 'false');
  });

  it('when the tree is locked, should not drag pages', () => {
    const { onMovePage } = setup({ disabled: true });

    expect(row('Algoritmos')).toHaveAttribute('draggable', 'false');
    drag(row('Algoritmos'), row(/^Culinária/));

    expect(onMovePage).not.toHaveBeenCalled();
  });
});
