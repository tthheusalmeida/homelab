import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { CategoryNode } from '../types/library.types';

import { CategoryTree } from './CategoryTree';

const docker: CategoryNode = {
  name: 'Docker',
  path: ['Tecnologia', 'Docker'],
  count: 1,
  children: [],
};
const tree: CategoryNode[] = [
  { name: 'Tecnologia', path: ['Tecnologia'], count: 2, children: [docker] },
  { name: 'Culinária', path: ['Culinária'], count: 1, children: [] },
];

const docker$ = () => screen.queryByRole('button', { name: /^Docker/ });

describe('CategoryTree: abrir e fechar', () => {
  it('when the selected category is open, should close it with its arrow', async () => {
    render(<CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />);

    expect(docker$()).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Recolher Tecnologia' }));

    expect(docker$()).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Expandir Tecnologia' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('when a category above the selected one is open, should close it with its arrow', async () => {
    render(<CategoryTree nodes={tree} selected={['Tecnologia', 'Docker']} onSelect={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: 'Recolher Tecnologia' }));

    expect(docker$()).not.toBeInTheDocument();
  });

  it('when a closed category is chosen, should open it', async () => {
    const { rerender } = render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    expect(docker$()).not.toBeInTheDocument();

    rerender(<CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />);

    expect(docker$()).toBeInTheDocument();
  });

  it('when a closed category is clicked, should choose it and open it', async () => {
    let selected: string[] = [];
    const { rerender } = render(
      <CategoryTree nodes={tree} selected={selected} onSelect={(path) => (selected = path)} />,
    );

    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia/ }));
    rerender(<CategoryTree nodes={tree} selected={selected} onSelect={() => {}} />);

    expect(selected).toEqual(['Tecnologia']);
    expect(docker$()).toBeInTheDocument();
  });

  it('when the already chosen and open category is clicked, should close it', async () => {
    render(<CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*2$/ }));

    expect(docker$()).not.toBeInTheDocument();
  });

  it('when it is closed and clicked again, should open it again', async () => {
    render(<CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*2$/ }));
    await userEvent.click(screen.getByRole('button', { name: /^Tecnologia\s*2$/ }));

    expect(docker$()).toBeInTheDocument();
  });

  it('when a category without subcategories is clicked, should only choose it', async () => {
    let selected: string[] = [];

    render(<CategoryTree nodes={tree} selected={[]} onSelect={(path) => (selected = path)} />);

    await userEvent.click(screen.getByRole('button', { name: /^Culinária/ }));

    expect(selected).toEqual(['Culinária']);
  });
});
