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
// Select nativo no lugar do select do base-ui, para poder escolher opções.
vi.mock('#components/OptionSelect', () => ({
  OptionSelect: ({
    value,
    options,
    label,
    disabled,
    onValueChange,
  }: {
    value?: string;
    options: { id: string; label: string }[];
    label?: string;
    disabled?: boolean;
    onValueChange: (value: string) => void;
  }) => (
    <select
      aria-label={label}
      value={value}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

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
const infra = node('Infra', ['Tecnologia', 'Infra'], 1);
const tree: CategoryNode[] = [
  node('Tecnologia', ['Tecnologia'], 4, [containers, infra]),
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

const nameField = () => screen.getByRole('textbox', { name: 'Nome' });
const parentSelect = () => screen.getByRole('combobox', { name: 'Dentro de' });
const save = () => screen.getByRole('button', { name: 'Salvar' });
const optionLabels = () =>
  Array.from(parentSelect().querySelectorAll('option')).map((option) => option.textContent);

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

  it('when opened, should show only the name and where it is, and say how many pages go along', () => {
    setup();

    expect(screen.getByText('Editar categoria')).toBeInTheDocument();
    expect(nameField()).toHaveValue('Containers');
    expect(parentSelect()).toHaveDisplayValue('Tecnologia');
    expect(screen.getByText(/As 2 páginas dela/)).toBeInTheDocument();
  });

  it('when the category has a single page, should say it in the singular', () => {
    setup(node('Sozinha', ['Sozinha'], 1));

    expect(screen.getByText(/As 1 página dela/)).toBeInTheDocument();
  });

  it('when listing where it can go, should offer the main level and every category except itself and what is inside it', () => {
    setup();

    expect(optionLabels()).toEqual([
      CategoryEditStrings.root,
      'Tecnologia',
      'Tecnologia › Infra',
      'Culinária',
    ]);
  });

  it('when a category is at the main level, should show "Nenhuma" as where it is', () => {
    setup(tree[1]);

    expect(parentSelect()).toHaveDisplayValue(CategoryEditStrings.root);
  });

  it('when a subcategory would pass 4 levels there, should not offer that place', () => {
    const deep = node('A', ['A'], 1, [
      node('B', ['A', 'B'], 1, [
        node('C', ['A', 'B', 'C'], 1, [node('D', ['A', 'B', 'C', 'D'], 1)]),
      ]),
    ]);

    render(
      <CategoryEditDialog
        category={deep}
        tree={[deep, node('X', ['X'], 1, [node('Y', ['X', 'Y'], 1)])]}
        onOpenChange={() => {}}
      />,
    );

    // "A" tem 4 níveis: só cabe no nível principal
    expect(optionLabels()).toEqual([CategoryEditStrings.root]);
  });

  it('when nothing changed, should not allow saving', () => {
    setup();

    expect(save()).toBeDisabled();
  });

  it('when only the name changes, should keep the place and the levels below follow by themselves', async () => {
    const { user } = setup();

    await user.clear(nameField());
    await user.type(nameField(), 'Conteineres');
    await user.click(save());

    expect(rename.mutate).toHaveBeenCalledWith(
      { from: ['Tecnologia', 'Containers'], to: ['Tecnologia', 'Conteineres'] },
      expect.any(Object),
    );
  });

  it('when only the place changes, should keep the name', async () => {
    const { user } = setup();

    await user.selectOptions(parentSelect(), 'Culinária');
    await user.click(save());

    expect(rename.mutate).toHaveBeenCalledWith(
      { from: ['Tecnologia', 'Containers'], to: ['Culinária', 'Containers'] },
      expect.any(Object),
    );
  });

  it('when moving to the main level, should save the name alone', async () => {
    const { user } = setup();

    await user.selectOptions(parentSelect(), CategoryEditStrings.root);
    await user.click(save());

    expect(rename.mutate).toHaveBeenCalledWith(
      { from: ['Tecnologia', 'Containers'], to: ['Containers'] },
      expect.any(Object),
    );
  });

  it('when the name has extra spaces, should trim it', async () => {
    const { user } = setup();

    await user.clear(nameField());
    await user.type(nameField(), '  Conteineres  ');
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

    await user.clear(nameField());
    await user.type(nameField(), 'Conteineres');
    await user.click(save());

    expect(snackbar.success).toHaveBeenCalledWith('2 páginas movidas para a nova categoria.');
    expect(onRenamed).toHaveBeenCalledWith(
      ['Tecnologia', 'Containers'],
      ['Tecnologia', 'Conteineres'],
    );
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('when the name already exists in that place, should warn that the pages will join it', async () => {
    const { user } = setup();

    await user.clear(nameField());
    await user.type(nameField(), 'infra');

    expect(screen.getByText(CategoryEditStrings.merge)).toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('when the name is free in that place, should not show the merge warning', async () => {
    const { user } = setup();

    await user.clear(nameField());
    await user.type(nameField(), 'Novidade');

    expect(screen.queryByText(CategoryEditStrings.merge)).not.toBeInTheDocument();
  });

  it('when only the capitals change, should save without calling it a merge', async () => {
    const { user } = setup();

    await user.clear(nameField());
    await user.type(nameField(), 'containers');

    expect(screen.queryByText(CategoryEditStrings.merge)).not.toBeInTheDocument();
    expect(save()).toBeEnabled();
  });

  it('when the name is cleared or only spaces, should not allow saving', async () => {
    const { user } = setup();

    await user.clear(nameField());
    expect(save()).toBeDisabled();

    await user.type(nameField(), '   ');
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

    expect(nameField()).toBeDisabled();
    expect(parentSelect()).toBeDisabled();
    expect(screen.getByRole('button', { name: CategoryEditStrings.saving })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
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
