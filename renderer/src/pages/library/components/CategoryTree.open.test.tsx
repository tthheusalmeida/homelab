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

const iconOf = (name: RegExp | string) =>
  (screen.getByRole('button', { name }).parentElement as HTMLElement).querySelector(
    '[data-state]',
  ) as SVGElement;

describe('CategoryTree: um ícone só por pasta', () => {
  it('when a folder has content, should have only the hexagon (no separate arrow)', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} pages={pages} />);

    const row = screen.getByRole('button', { name: /^Culinária/ }).parentElement as HTMLElement;

    expect(row.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Expandir Culinária' }).querySelector('svg')).toBe(
      row.querySelector('svg'),
    );
  });

  it('when the folder is closed, should draw the hexagon filled; open, hollow', async () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} pages={pages} />);

    expect(iconOf('Expandir Culinária')).toHaveAttribute('data-state', 'closed');
    expect(iconOf('Expandir Culinária').querySelector('path')).toHaveAttribute(
      'fill',
      'currentColor',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Expandir Culinária' }));

    expect(iconOf('Recolher Culinária')).toHaveAttribute('data-state', 'open');
    expect(iconOf('Recolher Culinária').querySelector('path')).toHaveAttribute('fill', 'none');
  });

  it('when the hexagon is clicked, should open and close the folder without choosing it', async () => {
    const onSelect = vi.fn();

    render(<CategoryTree nodes={tree} selected={[]} onSelect={onSelect} pages={pages} />);

    await userEvent.click(screen.getByRole('button', { name: 'Expandir Culinária' }));

    expect(screen.getByRole('button', { name: 'Bolo' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Recolher Culinária' }));

    expect(screen.queryByRole('button', { name: 'Bolo' })).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('when a folder is empty, should draw a faded hexagon that is not a button', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} pages={pages} />);

    expect(screen.queryByRole('button', { name: 'Expandir Vazia' })).not.toBeInTheDocument();
    expect(iconOf(/^Vazia/)).toHaveClass('text-muted-foreground/35');
  });

  it('when the folder is chosen, should paint its hexagon in the accent color', () => {
    render(
      <CategoryTree nodes={tree} selected={['Culinária']} onSelect={() => {}} pages={pages} />,
    );

    expect(iconOf('Recolher Culinária')).toHaveClass('text-primary');
  });
});

describe('CategoryTree: páginas mais perto da esquerda', () => {
  it('when drawing a page, should not leave the empty space of the arrow before it', () => {
    render(
      <CategoryTree nodes={tree} selected={['Culinária']} onSelect={() => {}} pages={pages} />,
    );

    const row = screen.getByRole('button', { name: 'Bolo' }).parentElement as HTMLElement;

    expect(row.children).toHaveLength(1);
  });

  it('when a level is open, should hug the guide line with its content', () => {
    const { container } = render(
      <CategoryTree nodes={tree} selected={['Culinária']} onSelect={() => {}} pages={pages} />,
    );
    const nested = container.querySelector('li ul') as HTMLElement;

    expect(nested).toHaveClass('ml-2.5', 'pl-0');
  });
});

describe('CategoryTree: lembrar o que está aberto', () => {
  it('when a folder is opened, should keep it open after the tree is drawn again (leaving the screen and coming back)', async () => {
    const first = render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        pages={pages}
        persistKey={KEY}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Expandir Tecnologia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Expandir Docker' }));
    first.unmount();

    render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        pages={pages}
        persistKey={KEY}
      />,
    );

    expect(screen.getByRole('button', { name: 'Recolher Tecnologia' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recolher Docker' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Compose' })).toBeInTheDocument();
  });

  it('when a page is clicked, should keep the open folders open', async () => {
    const onOpenPage = vi.fn();
    const first = render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        pages={pages}
        onOpenPage={onOpenPage}
        persistKey={KEY}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Expandir Tecnologia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Algoritmos' }));
    first.unmount();

    render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        pages={pages}
        persistKey={KEY}
      />,
    );

    expect(onOpenPage).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Algoritmos' })).toBeInTheDocument();
  });

  it('when a folder is closed, should keep it closed the next time', async () => {
    const first = render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        pages={pages}
        persistKey={KEY}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Expandir Tecnologia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Recolher Tecnologia' }));
    first.unmount();

    render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        pages={pages}
        persistKey={KEY}
      />,
    );

    expect(screen.getByRole('button', { name: 'Expandir Tecnologia' })).toBeInTheDocument();
  });

  it('when there is no key, should not keep anything', async () => {
    const first = render(
      <CategoryTree nodes={tree} selected={[]} onSelect={() => {}} pages={pages} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Expandir Tecnologia' }));
    first.unmount();

    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} pages={pages} />);

    expect(screen.getByRole('button', { name: 'Expandir Tecnologia' })).toBeInTheDocument();
    expect(window.localStorage.length).toBe(0);
  });

  it('when what was saved is corrupted or not a list, should start closed', () => {
    window.localStorage.setItem(KEY, '{nao e lista');

    render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        pages={pages}
        persistKey={KEY}
      />,
    );

    expect(screen.getByRole('button', { name: 'Expandir Tecnologia' })).toBeInTheDocument();
  });

  it('when the saved list has other types, should ignore them', () => {
    window.localStorage.setItem(KEY, JSON.stringify([3, null, 'tecnologia']));

    render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        pages={pages}
        persistKey={KEY}
      />,
    );

    expect(screen.getByRole('button', { name: 'Recolher Tecnologia' })).toBeInTheDocument();
  });

  it('when the storage is not available, should work anyway', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cheio');
    });

    render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        pages={pages}
        persistKey={KEY}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Expandir Tecnologia' }));

    expect(screen.getByRole('button', { name: 'Recolher Tecnologia' })).toBeInTheDocument();

    vi.restoreAllMocks();
  });

  it('when a category is chosen, should open it and keep that too', async () => {
    const first = render(
      <CategoryTree
        nodes={tree}
        selected={['Tecnologia', 'Docker']}
        onSelect={() => {}}
        pages={pages}
        persistKey={KEY}
      />,
    );

    first.unmount();

    render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        pages={pages}
        persistKey={KEY}
      />,
    );

    expect(screen.getByRole('button', { name: 'Recolher Tecnologia' })).toBeInTheDocument();
  });
});
