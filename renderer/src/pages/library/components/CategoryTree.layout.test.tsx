import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CategoryNode } from '../types/library.types';

import { CategoryTree, type TreePage } from './CategoryTree';

const tree: CategoryNode[] = [
  {
    name: 'Redes de computadores e sistemas distribuídos',
    path: ['Redes'],
    count: 12,
    children: [],
  },
  { name: 'Culinária', path: ['Culinária'], count: 1, children: [] },
];
const pages: TreePage[] = [
  {
    id: 'p1',
    title: 'Introdução às redes de computadores de longa distância',
    category: ['Redes'],
  },
  { id: 'p2', title: 'Bolo', category: ['Culinária'] },
];
const LONG_FOLDER = 'Redes de computadores e sistemas distribuídos';
const LONG_PAGE = 'Introdução às redes de computadores de longa distância';

/** O jsdom não mede nada: simula a largura do texto e a do espaço onde ele está. */
function measure(scrollWidth: number, clientWidth: number) {
  Object.defineProperty(HTMLElement.prototype, 'scrollWidth', {
    configurable: true,
    get: () => scrollWidth,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => clientWidth,
  });
}

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'scrollWidth');
  Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
});

const tooltip = () => document.querySelector('[data-slot="tooltip-content"]');
const folderRow = (name: RegExp | string) =>
  screen.getByRole('button', { name }).parentElement as HTMLElement;

describe('CategoryTree: tooltip dos nomes cortados', () => {
  it('when a category name is cut, should show it whole in a tooltip', async () => {
    measure(300, 100);
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    await userEvent.hover(screen.getByText(LONG_FOLDER));

    expect(
      await screen.findByText(LONG_FOLDER, { selector: '[data-slot="tooltip-content"]' }),
    ).toBeInTheDocument();
  });

  it('when a page title is cut, should show it whole in a tooltip', async () => {
    measure(300, 100);
    render(<CategoryTree nodes={tree} selected={['Redes']} onSelect={() => {}} pages={pages} />);

    await userEvent.hover(screen.getByText(LONG_PAGE));

    expect(
      await screen.findByText(LONG_PAGE, { selector: '[data-slot="tooltip-content"]' }),
    ).toBeInTheDocument();
  });

  it('when the names fit, should not show any tooltip', async () => {
    measure(80, 100);
    render(
      <CategoryTree nodes={tree} selected={['Culinária']} onSelect={() => {}} pages={pages} />,
    );

    await userEvent.hover(screen.getByText('Culinária'));
    await userEvent.hover(screen.getByText('Bolo'));
    await new Promise((resolve) => setTimeout(resolve, 450));

    expect(tooltip()).toBeNull();
  });

  it('when a page is drawn, should not use the browser title (only the tooltip when cut)', () => {
    render(
      <CategoryTree nodes={tree} selected={['Culinária']} onSelect={() => {}} pages={pages} />,
    );

    expect(screen.getByRole('button', { name: 'Bolo' })).not.toHaveAttribute('title');
  });
});

describe('CategoryTree: contador à direita e ações à esquerda dele', () => {
  const setup = () =>
    render(
      <CategoryTree
        nodes={tree}
        selected={[]}
        onSelect={() => {}}
        onEdit={() => {}}
        onCreate={() => {}}
      />,
    );

  it('when drawing a category, should put the count last and the actions just before it', () => {
    setup();

    const row = folderRow(/^Culinária/);
    const children = Array.from(row.children);
    const nameButton = screen.getByRole('button', { name: /^Culinária/ });
    const actions = screen.getByRole('button', { name: 'Editar a categoria Culinária' })
      .parentElement as HTMLElement;
    const count = row.querySelector('.font-mono') as HTMLElement;

    expect(children.indexOf(nameButton)).toBeLessThan(children.indexOf(actions));
    expect(children.indexOf(actions)).toBe(children.length - 2);
    expect(children.indexOf(count)).toBe(children.length - 1);
    expect(count).toHaveTextContent('1');
  });

  it('when drawing the actions, should keep the create and edit buttons together before the count', () => {
    setup();

    const actions = screen.getByRole('button', { name: 'Editar a categoria Culinária' })
      .parentElement as HTMLElement;

    expect(actions).toContainElement(
      screen.getByRole('button', { name: 'Nova categoria dentro de Culinária' }),
    );
  });

  it('when the row is not hovered or focused, should hide the actions without keeping their space', () => {
    setup();

    const actions = screen.getByRole('button', { name: 'Editar a categoria Culinária' })
      .parentElement as HTMLElement;

    expect(actions).toHaveClass('hidden', 'group-hover/cat:flex', 'group-focus-within/cat:flex');
  });

  it('when the count is shown, should be hidden from screen readers and still be part of the name of the button', () => {
    setup();

    const row = folderRow(/^Culinária/);

    expect(row.querySelector('.font-mono')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('button', { name: /^Culinária\s*1$/ })).toBeInTheDocument();
  });

  it('when the count is clicked, should choose the category', async () => {
    const onSelect = vi.fn();

    render(<CategoryTree nodes={tree} selected={[]} onSelect={onSelect} />);

    await userEvent.click(folderRow(/^Culinária/).querySelector('.font-mono') as HTMLElement);

    expect(onSelect).toHaveBeenCalledWith(['Culinária']);
  });

  it('when the category is chosen, should highlight the whole row, count included', () => {
    render(<CategoryTree nodes={tree} selected={['Culinária']} onSelect={() => {}} />);

    const row = folderRow(/^Culinária/);

    expect(row).toHaveClass('bg-primary/15');
    expect(row).toContainElement(row.querySelector('.font-mono') as HTMLElement);
  });
});

describe('CategoryTree: aviso de soltar sem mexer no layout', () => {
  const drag = () => {
    const data = { setData: vi.fn(), effectAllowed: '', dropEffect: '' };

    fireEvent.dragStart(folderRow('Bolo'), { dataTransfer: data });
  };

  const setup = () =>
    render(
      <CategoryTree
        nodes={tree}
        selected={['Culinária']}
        onSelect={() => {}}
        pages={pages}
        onMove={() => {}}
        onMovePage={() => {}}
      />,
    );

  it('when something is dragged, should swap the panel label for the hint on the same line', () => {
    setup();

    expect(screen.getByText('categorias')).toBeInTheDocument();

    drag();

    expect(screen.getByRole('status')).toHaveTextContent('Solte em uma categoria');
    expect(screen.queryByText('categorias')).not.toBeInTheDocument();
  });

  it('when something is dragged, should not add any element to the panel (nothing moves down)', () => {
    const { container } = setup();
    const before = container.querySelectorAll('*').length;

    drag();

    expect(container.querySelectorAll('*').length).toBe(before);
  });

  it('when the drag ends, should bring the label back', () => {
    setup();
    drag();

    fireEvent.dragEnd(folderRow('Bolo'));

    expect(screen.getByText('categorias')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('when the hint is shown, should stay on one line (cut with an ellipsis if it does not fit)', () => {
    setup();
    drag();

    expect(screen.getByRole('status')).toHaveClass('truncate');
  });
});
