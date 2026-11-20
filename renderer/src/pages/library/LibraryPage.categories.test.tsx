import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';

const state = vi.hoisted(() => ({
  filters: vi.fn(),
  rename: vi.fn(),
}));

const tree = [
  {
    name: 'Tecnologia',
    path: ['Tecnologia'],
    count: 1,
    children: [{ name: 'Docker', path: ['Tecnologia', 'Docker'], count: 1, children: [] }],
  },
];

vi.mock('./hooks/useLibrary', () => ({
  useDocuments: (filters: unknown) => {
    state.filters(filters);

    return { isLoading: false, isError: false, data: [], refetch: vi.fn() };
  },
  useCategories: () => ({ isLoading: false, isError: false, data: tree, refetch: vi.fn() }),
  useTags: () => ({ isLoading: false, isError: false, data: [], refetch: vi.fn() }),
  useRenameCategory: () => ({
    mutate: state.rename,
    isPending: false,
    isError: false,
    error: null,
  }),
}));
vi.mock('#components/Snackbar', () => ({
  useSnackbar: () => ({ success: vi.fn(), error: vi.fn() }),
}));

import { LibraryPage } from './LibraryPage';

const lastCategory = () => {
  const calls = state.filters.mock.calls;

  return (calls[calls.length - 1][0] as { category: string[] }).category;
};

beforeEach(() => {
  state.filters.mockReset();
  state.rename.mockReset();
});

function setup() {
  render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );
}

describe('LibraryPage: editar categoria', () => {
  it('when a category pencil is clicked, should open the edit dialog for it', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Editar a categoria Tecnologia' }));

    expect(screen.getByText('Editar categoria')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Categoria' })).toHaveValue('Tecnologia');
  });

  it('when the selected category is renamed, should keep the filter on it under the new name', async () => {
    setup();
    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*1$/ }));

    expect(lastCategory()).toEqual(['Tecnologia']);

    state.rename.mockImplementation(
      (_input: unknown, options: { onSuccess: (result: { moved: number }) => void }) =>
        options.onSuccess({ moved: 1 }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Editar a categoria Tecnologia' }));

    const field = screen.getByRole('combobox', { name: 'Categoria' });

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

    state.rename.mockImplementation(
      (_input: unknown, options: { onSuccess: (result: { moved: number }) => void }) =>
        options.onSuccess({ moved: 1 }),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Editar a categoria Docker' }));

    const field = screen.getByRole('combobox', { name: 'Subcategoria' });

    await userEvent.clear(field);
    await userEvent.type(field, 'Containers');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(lastCategory()).toEqual(['Tecnologia']);
  });
});
