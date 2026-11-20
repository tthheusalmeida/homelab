import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const create = vi.hoisted(() => ({
  mutate: vi.fn(),
  state: { isPending: false, isError: false, error: null as Error | null },
}));
const snackbar = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

vi.mock('../hooks/useLibrary', () => ({
  useCreateCategory: () => ({ mutate: create.mutate, ...create.state }),
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

import { CategoryCreateDialog, CategoryCreateStrings } from './CategoryCreateDialog';

const node = (name: string, path: string[], children: CategoryNode[] = []): CategoryNode => ({
  name,
  path,
  count: 0,
  children,
});

const deep = node(
  'A',
  ['A'],
  [node('B', ['A', 'B'], [node('C', ['A', 'B', 'C'], [node('D', ['A', 'B', 'C', 'D'])])])],
);
const tree: CategoryNode[] = [
  node('Tecnologia', ['Tecnologia'], [node('Docker', ['Tecnologia', 'Docker'])]),
  deep,
];

function setup(parent: string[] | null = []) {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();

  render(
    <CategoryCreateDialog
      parent={parent}
      tree={tree}
      onOpenChange={onOpenChange}
      onCreated={onCreated}
    />,
  );

  return { onOpenChange, onCreated, user: userEvent.setup() };
}

const nameField = () => screen.getByRole('textbox', { name: 'Nome' });
const parentSelect = () => screen.getByRole('combobox', { name: 'Dentro de' });
const submit = () => screen.getByRole('button', { name: 'Criar' });
const optionLabels = () =>
  Array.from(parentSelect().querySelectorAll('option')).map((option) => option.textContent);

beforeEach(() => {
  create.mutate.mockReset();
  create.state = { isPending: false, isError: false, error: null };
  snackbar.success.mockReset();
});

describe('CategoryCreateDialog', () => {
  it('when there is no place to create, should stay closed', () => {
    setup(null);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('when opened at the main level, should start empty with "Nenhuma" as the place', () => {
    setup([]);

    expect(screen.getByText('Nova categoria')).toBeInTheDocument();
    expect(nameField()).toHaveValue('');
    expect(parentSelect()).toHaveDisplayValue(CategoryCreateStrings.root);
    expect(submit()).toBeDisabled();
  });

  it('when opened from a category, should start inside it', () => {
    setup(['Tecnologia']);

    expect(parentSelect()).toHaveDisplayValue('Tecnologia');
  });

  it('when listing places, should offer the main level and every category that still has room', () => {
    setup();

    // "A › B › C › D" já tem 4 níveis: não cabe nada dentro dele
    expect(optionLabels()).toEqual([
      CategoryCreateStrings.root,
      'Tecnologia',
      'Tecnologia › Docker',
      'A',
      'A › B',
      'A › B › C',
    ]);
  });

  it('when a name is typed, should create it at the main level', async () => {
    const { user } = setup();

    await user.type(nameField(), 'Redes');
    await user.click(submit());

    expect(create.mutate).toHaveBeenCalledWith(['Redes'], expect.any(Object));
  });

  it('when creating inside a category, should put the name after it', async () => {
    const { user } = setup(['Tecnologia']);

    await user.type(nameField(), 'Kubernetes');
    await user.click(submit());

    expect(create.mutate).toHaveBeenCalledWith(['Tecnologia', 'Kubernetes'], expect.any(Object));
  });

  it('when the place is changed in the list, should create there', async () => {
    const { user } = setup();

    await user.selectOptions(parentSelect(), 'Tecnologia');
    await user.type(nameField(), 'Podman');
    await user.click(submit());

    expect(create.mutate).toHaveBeenCalledWith(['Tecnologia', 'Podman'], expect.any(Object));
  });

  it('when the name has several levels separated by slash, should create all of them and say so', async () => {
    const { user } = setup();

    await user.type(nameField(), 'Redes / Segurança / Firewall');

    expect(screen.getByText(CategoryCreateStrings.willCreate(3))).toBeInTheDocument();
    expect(screen.getByText('Redes › Segurança › Firewall')).toBeInTheDocument();

    await user.click(submit());

    expect(create.mutate).toHaveBeenCalledWith(
      ['Redes', 'Segurança', 'Firewall'],
      expect.any(Object),
    );
  });

  it('when the name uses the arrow or blank levels, should still read the levels', async () => {
    const { user } = setup();

    await user.type(nameField(), ' Redes › › Firewall ');
    await user.click(submit());

    expect(create.mutate).toHaveBeenCalledWith(['Redes', 'Firewall'], expect.any(Object));
  });

  it('when the category already exists (other capitals), should warn and not allow', async () => {
    const { user } = setup(['Tecnologia']);

    await user.type(nameField(), 'docker');

    expect(screen.getByText(CategoryCreateStrings.exists)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('when the path would pass 4 levels, should warn and not allow', async () => {
    const { user } = setup(['Tecnologia', 'Docker']);

    await user.type(nameField(), 'Um / Dois / Tres');

    expect(screen.getByText(CategoryCreateStrings.tooDeep)).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('when it is created, should say so, tell the page the new path and close', async () => {
    const { user, onCreated, onOpenChange } = setup(['Tecnologia']);

    create.mutate.mockImplementation((_path: unknown, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    );

    await user.type(nameField(), 'Podman');
    await user.click(submit());

    expect(snackbar.success).toHaveBeenCalledWith(CategoryCreateStrings.done);
    expect(onCreated).toHaveBeenCalledWith(['Tecnologia', 'Podman']);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('when creating fails, should show the reason and keep the dialog open', () => {
    create.state = { isPending: false, isError: true, error: new Error('Já existe.') };

    setup();

    expect(screen.getByRole('alert')).toHaveTextContent('Já existe.');
  });

  it('when creating fails with no message, should show a generic one', () => {
    create.state = { isPending: false, isError: true, error: new Error('') };

    setup();

    expect(screen.getByRole('alert')).toHaveTextContent(CategoryCreateStrings.failed);
  });

  it('when creating, should lock the fields and not close with Esc', async () => {
    create.state = { isPending: true, isError: false, error: null };

    const { user, onOpenChange } = setup();

    expect(nameField()).toBeDisabled();
    expect(screen.getByRole('button', { name: CategoryCreateStrings.creating })).toBeDisabled();

    await user.keyboard('{Escape}');

    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('when cancelling or pressing Esc, should close without creating', async () => {
    const { user, onOpenChange } = setup();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(create.mutate).not.toHaveBeenCalled();
  });
});
