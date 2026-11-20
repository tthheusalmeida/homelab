import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  { id: 'p1', title: 'Algoritmos', category: ['Tecnologia'] },
  { id: 'p2', title: 'Compose', category: ['Tecnologia', 'Docker'] },
  { id: 'p3', title: 'Bolo', category: ['Culinária'] },
];
const KEY = 'test:tree:open';

afterEach(() => window.localStorage.clear());

const folder = (name: RegExp | string) => screen.getByRole('button', { name });
const iconOf = (name: RegExp | string) => folder(name).querySelector('[data-state]') as SVGElement;
const isOpen = (name: RegExp | string) => folder(name).getAttribute('aria-expanded') === 'true';

function tree$(extra: Partial<Parameters<typeof CategoryTree>[0]> = {}) {
  return <CategoryTree nodes={tree} selected={[]} onSelect={() => {}} pages={pages} {...extra} />;
}

describe('CategoryTree: um ícone só por pasta', () => {
  it('when a folder has content, should have only the hexagon inside its one button (no separate arrow)', () => {
    render(tree$());

    const row = folder(/^Culinária/).parentElement as HTMLElement;

    expect(row.querySelectorAll('svg')).toHaveLength(1);
    expect(folder(/^Culinária/).querySelector('svg')).toBe(row.querySelector('svg'));
  });

  it('when the folder is closed, should draw the hexagon filled; open, hollow', async () => {
    render(tree$());

    expect(iconOf(/^Culinária/)).toHaveAttribute('data-state', 'closed');
    expect(iconOf(/^Culinária/).querySelector('path')).toHaveAttribute('fill', 'currentColor');

    await userEvent.click(folder(/^Culinária/));

    expect(iconOf(/^Culinária/)).toHaveAttribute('data-state', 'open');
    expect(iconOf(/^Culinária/).querySelector('path')).toHaveAttribute('fill', 'none');
  });

  it('when the hexagon is clicked, should do the same as clicking the name (it is one thing)', async () => {
    const onSelect = vi.fn();

    render(tree$({ onSelect }));

    await userEvent.click(iconOf(/^Culinária/));

    expect(onSelect).toHaveBeenCalledWith(['Culinária']);
    expect(isOpen(/^Culinária/)).toBe(true);
  });

  it('when the count is clicked, should do the same as clicking the name', async () => {
    const onSelect = vi.fn();

    render(tree$({ onSelect }));

    await userEvent.click(
      (folder(/^Culinária/).parentElement as HTMLElement).querySelector(
        '.font-mono',
      ) as HTMLElement,
    );

    expect(onSelect).toHaveBeenCalledWith(['Culinária']);
    expect(isOpen(/^Culinária/)).toBe(true);
  });

  it('when a folder is empty, should draw a faded hexagon and have nothing to open', () => {
    render(tree$());

    expect(iconOf(/^Vazia/)).toHaveClass('text-muted-foreground/35');
    expect(folder(/^Vazia/)).not.toHaveAttribute('aria-expanded');
  });

  it('when the folder is chosen, should paint its hexagon in the accent color', () => {
    render(tree$({ selected: ['Culinária'] }));

    expect(iconOf(/^Culinária/)).toHaveClass('text-primary');
  });
});

describe('CategoryTree: páginas mais perto da esquerda', () => {
  it('when drawing a page, should not leave an empty space before it', () => {
    render(tree$({ selected: ['Culinária'] }));

    const row = screen.getByRole('button', { name: 'Bolo' }).parentElement as HTMLElement;

    expect(row.children).toHaveLength(1);
  });

  it('when a level is open, should keep the content close to the line', () => {
    const { container } = render(tree$({ selected: ['Culinária'] }));
    const nested = container.querySelector('li ul') as HTMLElement;

    expect(nested).toHaveClass('ml-2.5');
    expect(nested.firstElementChild).toHaveClass('pl-1.5');
  });
});

describe('CategoryTree: lembrar o que está aberto', () => {
  it('when a folder is opened, should keep it open after the tree is drawn again (leaving the screen and coming back)', async () => {
    const first = render(tree$({ persistKey: KEY }));

    await userEvent.click(folder(/^Tecnologia/));
    await userEvent.click(folder(/^Docker/));
    first.unmount();

    render(tree$({ persistKey: KEY }));

    expect(isOpen(/^Tecnologia/)).toBe(true);
    expect(isOpen(/^Docker/)).toBe(true);
    expect(screen.getByRole('button', { name: 'Compose' })).toBeInTheDocument();
  });

  it('when a page is clicked, should keep the open folders open', async () => {
    const onOpenPage = vi.fn();
    const first = render(tree$({ onOpenPage, persistKey: KEY }));

    await userEvent.click(folder(/^Tecnologia/));
    await userEvent.click(screen.getByRole('button', { name: 'Algoritmos' }));
    first.unmount();

    render(tree$({ persistKey: KEY }));

    expect(onOpenPage).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Algoritmos' })).toBeInTheDocument();
  });

  it('when a folder is closed, should keep it closed the next time', async () => {
    const first = render(tree$({ persistKey: KEY }));

    await userEvent.click(folder(/^Tecnologia/));
    await userEvent.click(folder(/^Tecnologia/));
    first.unmount();

    render(tree$({ persistKey: KEY }));

    expect(isOpen(/^Tecnologia/)).toBe(false);
  });

  it('when there is no key, should not keep anything', async () => {
    const first = render(tree$());

    await userEvent.click(folder(/^Tecnologia/));
    first.unmount();

    render(tree$());

    expect(isOpen(/^Tecnologia/)).toBe(false);
    expect(window.localStorage.length).toBe(0);
  });

  it('when what was saved is corrupted, should start closed', () => {
    window.localStorage.setItem(KEY, '{nao e lista');

    render(tree$({ persistKey: KEY }));

    expect(isOpen(/^Tecnologia/)).toBe(false);
  });

  it('when what was saved is not a list, should start closed', () => {
    window.localStorage.setItem(KEY, JSON.stringify({ a: 1 }));

    render(tree$({ persistKey: KEY }));

    expect(isOpen(/^Tecnologia/)).toBe(false);
  });

  it('when the saved list has other types, should ignore them', () => {
    window.localStorage.setItem(KEY, JSON.stringify([3, null, 'tecnologia']));

    render(tree$({ persistKey: KEY }));

    expect(isOpen(/^Tecnologia/)).toBe(true);
  });

  it('when the storage is not available, should work anyway', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio');
    });

    render(tree$({ persistKey: KEY }));

    await userEvent.click(folder(/^Tecnologia/));

    expect(isOpen(/^Tecnologia/)).toBe(true);

    vi.restoreAllMocks();
  });

  it('when a category was chosen, should open it and keep that too', () => {
    const first = render(tree$({ selected: ['Tecnologia', 'Docker'], persistKey: KEY }));

    first.unmount();

    render(tree$({ persistKey: KEY }));

    expect(isOpen(/^Tecnologia/)).toBe(true);
  });
});
