import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CategoryNode } from '../types/library.types';

import { CategoryTree } from './CategoryTree';

const tree: CategoryNode[] = [
  { name: 'Vazia', path: ['Vazia'], count: 0, children: [] },
  { name: 'Cheia', path: ['Cheia'], count: 2, children: [] },
  {
    name: 'PaiVazio',
    path: ['PaiVazio'],
    count: 0,
    children: [{ name: 'Filha', path: ['PaiVazio', 'Filha'], count: 0, children: [] }],
  },
];

const setup = (extra: Partial<Parameters<typeof CategoryTree>[0]> = {}) =>
  render(
    <CategoryTree
      nodes={tree}
      selected={[]}
      onSelect={() => {}}
      onEdit={() => {}}
      onCreate={() => {}}
      onDelete={() => {}}
      {...extra}
    />,
  );

const actionsOf = (name: RegExp) =>
  (screen.getByRole('button', { name }).parentElement as HTMLElement).querySelector(
    '.hidden',
  ) as HTMLElement;

describe('CategoryTree: excluir categoria vazia', () => {
  it('when a category is empty, should offer to delete it', () => {
    setup();

    expect(screen.getByRole('button', { name: 'Excluir a categoria Vazia' })).toBeInTheDocument();
  });

  it('when a category has pages, should not offer to delete it', () => {
    setup();

    expect(
      screen.queryByRole('button', { name: 'Excluir a categoria Cheia' }),
    ).not.toBeInTheDocument();
  });

  it('when there is no delete handler, should not offer it', () => {
    setup({ onDelete: undefined });

    expect(screen.queryByRole('button', { name: /Excluir a categoria/ })).not.toBeInTheDocument();
  });

  it('when a category is empty, should put the delete button last: create, edit, delete (left to right)', () => {
    setup();

    const labels = Array.from(actionsOf(/^Vazia/).querySelectorAll('button')).map((button) =>
      button.getAttribute('aria-label'),
    );

    expect(labels).toEqual([
      'Nova categoria dentro de Vazia',
      'Editar a categoria Vazia',
      'Excluir a categoria Vazia',
    ]);
  });

  it('when the actions are drawn, should keep them before the count, which stays last', () => {
    setup();

    const row = screen.getByRole('button', { name: /^Vazia/ }).parentElement as HTMLElement;
    const children = Array.from(row.children);

    expect(children.indexOf(actionsOf(/^Vazia/))).toBe(children.length - 2);
    expect(children[children.length - 1]).toHaveClass('font-mono');
  });

  it('when the delete button is clicked, should hand the category over without choosing or opening it', async () => {
    const onDelete = vi.fn();
    const onSelect = vi.fn();

    setup({ onDelete, onSelect });

    await userEvent.click(screen.getByRole('button', { name: 'Excluir a categoria Vazia' }));

    expect(onDelete).toHaveBeenCalledWith(tree[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('when a category is empty but has empty subcategories, should still offer to delete it', () => {
    setup();

    expect(
      screen.getByRole('button', { name: 'Excluir a categoria PaiVazio' }),
    ).toBeInTheDocument();
  });

  it('when the button is drawn, should look like a destructive action on hover', () => {
    setup();

    expect(screen.getByRole('button', { name: 'Excluir a categoria Vazia' })).toHaveClass(
      'hover:text-destructive',
    );
  });

  it('when the tree is locked, should lock the delete button too', () => {
    setup({ disabled: true });

    expect(screen.getByRole('button', { name: 'Excluir a categoria Vazia' })).toBeDisabled();
  });

  it('when only delete is allowed (no create, no edit), should still show the actions of an empty category', () => {
    setup({ onCreate: undefined, onEdit: undefined });

    expect(screen.getByRole('button', { name: 'Excluir a categoria Vazia' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Excluir a categoria Cheia' }),
    ).not.toBeInTheDocument();
  });
});
