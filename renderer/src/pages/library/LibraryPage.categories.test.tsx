import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

const state = vi.hoisted(() => ({
  filters: vi.fn(),
  rename: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  pending: false,
  tree: [] as unknown[],
}));
const snackbar = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));

const node = (name: string, path: string[], count: number, children: unknown[] = []) => ({
  name,
  path,
  count,
  children,
});

vi.mock('./hooks/useLibrary', () => ({
  useDocuments: (filters: unknown) => {
    state.filters(filters);

    return { isLoading: false, isError: false, data: [], refetch: vi.fn() };
  },
  useCategories: () => ({
    isLoading: false,
    isError: false,
    data: state.tree,
    refetch: vi.fn(),
  }),
  useTags: () => ({ isLoading: false, isError: false, data: [], refetch: vi.fn() }),
  useCreateCategory: () => ({
    mutate: state.create,
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useDeleteCategory: () => ({
    mutate: state.remove,
    reset: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
  useRenameCategory: () => ({
    mutate: state.rename,
    reset: vi.fn(),
    isPending: state.pending,
    isError: false,
    error: null,
  }),
}));
vi.mock('#components/Snackbar', () => ({ useSnackbar: () => snackbar }));

import { LibraryPage } from './LibraryPage';

const lastCategory = () => {
  const calls = state.filters.mock.calls;

  return (calls[calls.length - 1][0] as { category: string[] }).category;
};

const succeed = () =>
  state.rename.mockImplementation(
    (_input: unknown, options: { onSuccess: (result: { moved: number }) => void }) =>
      options.onSuccess({ moved: 1 }),
  );

/** O arrastar do navegador: o `dataTransfer` precisa existir para o React ler. */
const dataTransfer = () => ({ setData: vi.fn(), effectAllowed: '', dropEffect: '' });

/** A linha (o bloco que arrasta) de uma categoria da árvore. */
const rowOf = (name: RegExp) => screen.getByRole('button', { name }).parentElement as HTMLElement;
const rootDrop = () =>
  screen.getByRole('button', { name: 'Todas as categorias' }).parentElement as HTMLElement;

function drag(from: HTMLElement, to: HTMLElement) {
  const transfer = dataTransfer();

  fireEvent.dragStart(from, { dataTransfer: transfer });
  fireEvent.dragOver(to, { dataTransfer: transfer });
  fireEvent.drop(to, { dataTransfer: transfer });
}

beforeEach(() => {
  state.filters.mockReset();
  state.rename.mockReset();
  state.create.mockReset();
  state.remove.mockReset();
  state.pending = false;
  state.tree = [
    node('Tecnologia', ['Tecnologia'], 1, [node('Docker', ['Tecnologia', 'Docker'], 1)]),
    node('Culinária', ['Culinária'], 2),
  ];
  snackbar.success.mockReset();
  snackbar.error.mockReset();
});

function setup() {
  render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );
}

describe('LibraryPage: editar categoria', () => {
  it('when a category pencil is clicked, should open the edit dialog with its name', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Editar a categoria Tecnologia' }));

    expect(screen.getByText('Editar categoria')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Nome' })).toHaveValue('Tecnologia');
  });

  it('when the selected category is renamed, should keep the filter on it under the new name', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*1$/ }));

    expect(lastCategory()).toEqual(['Tecnologia']);

    succeed();
    await userEvent.click(screen.getByRole('button', { name: 'Editar a categoria Tecnologia' }));

    const field = screen.getByRole('textbox', { name: 'Nome' });

    await userEvent.clear(field);
    await userEvent.type(field, 'TI');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(state.rename).toHaveBeenCalledWith(
      { from: ['Tecnologia'], to: ['TI'] },
      expect.any(Object),
    );
    expect(lastCategory()).toEqual(['TI']);
  });

  it('when a subcategory of the selected one is renamed, should keep the filter on the parent', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*1$/ }));

    succeed();
    await userEvent.click(screen.getByRole('button', { name: 'Editar a categoria Docker' }));

    const field = screen.getByRole('textbox', { name: 'Nome' });

    await userEvent.clear(field);
    await userEvent.type(field, 'Containers');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(lastCategory()).toEqual(['Tecnologia']);
  });
});

describe('LibraryPage: mover categoria arrastando', () => {
  it('when a category is dropped on another, should move it inside that one and say so', async () => {
    succeed();
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*1$/ }));

    drag(rowOf(/^Docker/), rowOf(/^Culinária/));

    expect(state.rename).toHaveBeenCalledWith(
      { from: ['Tecnologia', 'Docker'], to: ['Culinária', 'Docker'] },
      expect.any(Object),
    );
    expect(snackbar.success).toHaveBeenCalledWith('1 página movida para a nova categoria.');
  });

  it('when a category is dropped on "Todas as categorias", should move it to the main level', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*1$/ }));

    drag(rowOf(/^Docker/), rootDrop());

    expect(state.rename).toHaveBeenCalledWith(
      { from: ['Tecnologia', 'Docker'], to: ['Docker'] },
      expect.any(Object),
    );
  });

  it('when the category moves under the selected filter, should keep the filter following it', async () => {
    succeed();
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*1$/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Docker/ }));

    expect(lastCategory()).toEqual(['Tecnologia', 'Docker']);

    drag(rowOf(/^Docker/), rootDrop());

    expect(lastCategory()).toEqual(['Docker']);
  });

  it('when it is dropped where it already is, should do nothing', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*1$/ }));

    drag(rowOf(/^Docker/), rowOf(/^Tecnologia/));

    expect(state.rename).not.toHaveBeenCalled();
  });

  it('when a category is dropped inside itself, should do nothing', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*1$/ }));

    drag(rowOf(/^Tecnologia/), rowOf(/^Docker/));

    expect(state.rename).not.toHaveBeenCalled();
  });

  it('when the drop would pass 4 levels, should do nothing', async () => {
    state.tree = [
      node('A', ['A'], 1, [
        node('B', ['A', 'B'], 1, [
          node('C', ['A', 'B', 'C'], 1, [node('D', ['A', 'B', 'C', 'D'], 1)]),
        ]),
      ]),
      node('X', ['X'], 1),
    ];
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^A\s*1$/ }));

    drag(rowOf(/^A\s*1$/), rowOf(/^X/));

    expect(state.rename).not.toHaveBeenCalled();
  });

  it('when the target already has one with that name, should ask before joining them', async () => {
    state.tree = [
      node('Tecnologia', ['Tecnologia'], 1, [node('Docker', ['Tecnologia', 'Docker'], 1)]),
      node('Culinária', ['Culinária'], 2, [node('Docker', ['Culinária', 'Docker'], 2)]),
    ];
    succeed();
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*1$/ }));

    drag(
      screen.getAllByRole('button', { name: /^Docker/ })[0].parentElement as HTMLElement,
      rowOf(/^Culinária/),
    );

    expect(state.rename).not.toHaveBeenCalled();
    expect(screen.getByText('Juntar as categorias?')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Juntar' }));

    expect(state.rename).toHaveBeenCalledWith(
      { from: ['Tecnologia', 'Docker'], to: ['Culinária', 'Docker'] },
      expect.any(Object),
    );
  });

  it('when the pages are being moved, should lock the tree', () => {
    state.pending = true;
    setup();

    expect(screen.getByRole('navigation', { name: 'Categorias' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
});

describe('LibraryPage: criar e excluir categoria', () => {
  it('when Nova categoria is clicked, should open the dialog for the main level', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Nova categoria' }));

    expect(screen.getByRole('textbox', { name: 'Nome' })).toBeInTheDocument();
  });

  it('when a category is created, should create the path and choose the new category', async () => {
    state.create.mockImplementation((_path: unknown, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    );
    setup();
    await userEvent.click(screen.getByRole('button', { name: 'Nova categoria' }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'Redes / Segurança');
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }));

    expect(state.create).toHaveBeenCalledWith(['Redes', 'Segurança'], expect.any(Object));
    expect(lastCategory()).toEqual(['Redes', 'Segurança']);
  });

  it('when the plus of a category is clicked, should create inside it', async () => {
    state.create.mockImplementation((_path: unknown, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    );
    setup();
    await userEvent.click(
      screen.getByRole('button', { name: 'Nova categoria dentro de Culinária' }),
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Nome' }), 'Sobremesas');
    await userEvent.click(screen.getByRole('button', { name: 'Criar' }));

    expect(state.create).toHaveBeenCalledWith(['Culinária', 'Sobremesas'], expect.any(Object));
  });

  it('when the chosen category is deleted, should go back to all categories', async () => {
    state.tree = [node('Vazia', ['Vazia'], 0)];
    state.remove.mockImplementation((_path: unknown, options: { onSuccess: () => void }) =>
      options.onSuccess(),
    );
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Vazias*0$/ }));

    expect(lastCategory()).toEqual(['Vazia']);

    await userEvent.click(screen.getByRole('button', { name: 'Editar a categoria Vazia' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir categoria' }));
    await userEvent.click(
      within(screen.getAllByRole('dialog').at(-1) as HTMLElement).getByRole('button', {
        name: 'Excluir categoria',
      }),
    );

    expect(state.remove).toHaveBeenCalledWith(['Vazia'], expect.any(Object));
    expect(lastCategory()).toEqual([]);
  });
});
