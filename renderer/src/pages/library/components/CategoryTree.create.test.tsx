import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CategoryNode } from '../types/library.types';

import { CategoryTree } from './CategoryTree';

const full: CategoryNode = {
  name: 'D',
  path: ['A', 'B', 'C', 'D'],
  count: 0,
  children: [],
};
const tree: CategoryNode[] = [
  {
    name: 'A',
    path: ['A'],
    count: 0,
    children: [
      {
        name: 'B',
        path: ['A', 'B'],
        count: 0,
        children: [{ name: 'C', path: ['A', 'B', 'C'], count: 0, children: [full] }],
      },
    ],
  },
  { name: 'Vazia', path: ['Vazia'], count: 0, children: [] },
];

describe('CategoryTree: criar', () => {
  it('when there is no create handler, should not show any plus', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    expect(screen.queryByRole('button', { name: /Nova categoria/ })).not.toBeInTheDocument();
  });

  it('when there is a create handler, should offer Nova categoria at the top for the main level', async () => {
    const onCreate = vi.fn();

    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} onCreate={onCreate} />);

    await userEvent.click(screen.getByRole('button', { name: 'Nova categoria' }));

    expect(onCreate).toHaveBeenCalledWith([]);
  });

  it('when the plus of a category is clicked, should ask to create inside it', async () => {
    const onCreate = vi.fn();

    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} onCreate={onCreate} />);

    await userEvent.click(screen.getByRole('button', { name: 'Nova categoria dentro de Vazia' }));

    expect(onCreate).toHaveBeenCalledWith(['Vazia']);
  });

  it('when a category already has 4 levels, should not offer a plus inside it', () => {
    render(
      <CategoryTree
        nodes={tree}
        selected={['A', 'B', 'C', 'D']}
        onSelect={() => {}}
        onCreate={() => {}}
      />,
    );

    expect(screen.getByRole('button', { name: 'Nova categoria dentro de C' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Nova categoria dentro de D' }),
    ).not.toBeInTheDocument();
  });

  it('when the tree is locked, should lock the plus buttons too', () => {
    render(
      <CategoryTree nodes={tree} selected={[]} onSelect={() => {}} onCreate={() => {}} disabled />,
    );

    expect(screen.getByRole('button', { name: 'Nova categoria' })).toBeDisabled();
  });

  it('when there are no categories yet, should still offer Nova categoria', () => {
    render(<CategoryTree nodes={[]} selected={[]} onSelect={() => {}} onCreate={() => {}} />);

    expect(screen.getByRole('button', { name: 'Nova categoria' })).toBeInTheDocument();
  });

  it('when a category is empty, should draw it like a category without subcategories (faded)', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    const row = screen.getByRole('button', { name: /^Vazia/ });

    expect(row.querySelector('[class*="clip-path"]')).toHaveClass('bg-muted-foreground/35');
    expect(row.querySelector('.font-mono')).toHaveTextContent('0');
  });
});
