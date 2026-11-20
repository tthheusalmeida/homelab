import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const rename = vi.hoisted(() => ({
  mutate: vi.fn(),
  state: { isPending: false, isError: false, error: null as Error | null },
}));
const snackbar = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../hooks/useLibrary', () => ({
  useRenameCategory: () => ({ mutate: rename.mutate, ...rename.state }),
}));
vi.mock('#components/Snackbar', () => ({ useSnackbar: () => snackbar }));

import type { CategoryNode } from '../types/library.types';

import { CategoryEditDialog, CategoryEditStrings } from './CategoryEditDialog';

const node = (name: string, path: string[], count: number, children: CategoryNode[] = []) => ({
  name,
  path,
  count,
  children,
});

const containers = node('Containers', ['Tecnologia', 'Containers'], 2, [
  node('Docker', ['Tecnologia', 'Containers', 'Docker'], 1),
]);
const tree: CategoryNode[] = [
  node('Tecnologia', ['Tecnologia'], 4, [containers, node('Infra', ['Tecnologia', 'Infra'], 1)]),
  node('Culinária', ['Culinária'], 3),
];

function setup(category: CategoryNode | null = containers) {
  const onOpenChange = vi.fn();
  const onRenamed = vi.fn();

  render(
    <CategoryEditDialog
      category={category}
      tree={tree}
      onOpenChange={onOpenChange}
      onRenamed={onRenamed}
    />,
  );

  return { onOpenChange, onRenamed, user: userEvent.setup() };
}

const field = (name: string) => screen.getByRole('combobox', { name });
const save = () => screen.getByRole('button', { name: 'Salvar' });

beforeEach(() => {
  rename.mutate.mockReset();
  rename.state = { isPending: false, isError: false, error: null };
  snackbar.success.mockReset();
});

describe('CategoryEditDialog', () => {
  it('when there is no category, should stay closed', () => {
    setup(null);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('when opened, should show the current path and say how many pages go along', () => {
    setup();

    expect(screen.getByText('Editar categoria')).toBeInTheDocument();
    expect(field('Categoria')).toHaveValue('Tecnologia');
    expect(field('Subcategoria')).toHaveValue('Containers');
    expect(screen.getByText(/As 2 páginas dela/)).toBeInTheDocument();
  });

  it('when the category has a single page, should say it in the singular', () => {
    setup(node('Sozinha', ['Sozinha'], 1));

    expect(screen.getByText(/As 1 página dela/)).toBeInTheDocument();
  });

  it('when nothing changed, should not allow saving', () => {
    setup();

    expect(save()).toBeDisabled();
  });

  it('when the name changes, should save the new path from the old one', async () => {
    const { user } = setup();

    await user.clear(field('Subcategoria'));
    await user.type(field('Subcategoria'), 'Conteineres');
    await user.click(save());

    expect(rename.mutate).toHaveBeenCalledWith(
      { from: ['Tecnologia', 'Containers'], to: ['Tecnologia', 'Conteineres'] },
      expect.any(Object),
    );
  });

  it('when it is saved, should say how many pages moved, tell the page and close', async () => {
    const { user, onRenamed, onOpenChange } = setup();

    rename.mutate.mockImplementation(
      (_input: unknown, options: { onSuccess: (result: { moved: number }) => void }) =>
        options.onSuccess({ moved: 2 }),
    );

    await user.clear(field('Subcategoria'));
    await user.type(field('Subcategoria'), 'Conteineres');
    await user.click(save());

    expect(snackbar.success).toHaveBeenCalledWith('2 páginas movidas para a nova categoria.');
    expect(onRenamed).toHaveBeenCalledWith(
      ['Tecnologia', 'Containers'],
      ['Tecnologia', 'Conteineres'],
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('when the new path already exists, should warn that the pages will join it', async () => {
    const { user } = setup();

    await user.clear(field('Subcategoria'));
    await user.type(field('Subcategoria'), 'infra');

    expect(screen.getByText(CategoryEditStrings.merge)).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('when the new path does not exist, should not show the merge warning', async () => {
    const { user } = setup();

    await user.clear(field('Subcategoria'));
    await user.type(field('Subcategoria'), 'Novidade');

    expect(screen.queryByText(CategoryEditStrings.merge)).not.toBeInTheDocument();
  });

  it('when only the capitals change, should save without calling it a merge', async () => {
    const { user } = setup();

    await user.clear(field('Subcategoria'));
    await user.type(field('Subcategoria'), 'containers');

    expect(screen.queryByText(CategoryEditStrings.merge)).not.toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('when a subcategory would pass the 4 levels, should warn and not allow saving', async () => {
    const { user } = setup(tree[0]);

    // Tecnologia > Containers > Docker tem 3 níveis; sob "A > B" ficaria com 5
    await user.clear(field('Categoria'));
    await user.type(field('Categoria'), 'A');
    await user.type(field('Subcategoria'), 'B');
    await user.type(field('Subcategoria 2'), 'C');

    expect(screen.getByText(CategoryEditStrings.tooDeep)).toBeInTheDocument();
    expect(save()).toBeDisabled();
  });

  it('when the whole path is cleared, should not allow saving', async () => {
    const { user } = setup(node('Sozinha', ['Sozinha'], 1));

    await user.clear(field('Categoria'));

    expect(save()).toBeDisabled();
  });

  it('when saving fails, should show the reason and keep the dialog open', () => {
    rename.state = {
      isPending: false,
      isError: true,
      error: new Error('Categoria não encontrada.'),
    };

    setup();

    expect(screen.getByRole('alert')).toHaveTextContent('Categoria não encontrada.');
    expect(screen.getByText('Editar categoria')).toBeInTheDocument();
  });

  it('when saving fails with no message, should show a generic one', () => {
    rename.state = { isPending: false, isError: true, error: new Error('') };

    setup();

    expect(screen.getByRole('alert')).toHaveTextContent(CategoryEditStrings.failed);
  });

  it('when saving, should lock the fields and the buttons', () => {
    rename.state = { isPending: true, isError: false, error: null };

    setup();

    expect(field('Categoria')).toBeDisabled();
    expect(screen.getByRole('button', { name: CategoryEditStrings.saving })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });

  it('when the pages are being moved, should say so on the button', () => {
    rename.state = { isPending: true, isError: false, error: null };

    setup();

    expect(screen.getByRole('button', { name: CategoryEditStrings.saving })).toBeDisabled();
  });

  it('when the pages are being moved, should not close with Esc', async () => {
    rename.state = { isPending: true, isError: false, error: null };

    const { user, onOpenChange } = setup();

    await user.keyboard('{Escape}');

    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByText('Editar categoria')).toBeInTheDocument();
  });

  it('when nothing is being moved, should close with Esc', async () => {
    const { user, onOpenChange } = setup();

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('when cancelling, should close without saving', async () => {
    const { user, onOpenChange } = setup();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(rename.mutate).not.toHaveBeenCalled();
  });
});

describe('CategoryEditStrings', () => {
  it('when nothing moved, should say so', () => {
    expect(CategoryEditStrings.done(0)).toBe('Nada mudou.');
    expect(CategoryEditStrings.done(1)).toBe('1 página movida para a nova categoria.');
  });
});
