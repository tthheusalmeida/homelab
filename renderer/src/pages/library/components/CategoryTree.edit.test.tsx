import { describe, expect, it, vi } from 'vitest';
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

describe('CategoryTree: editar', () => {
  it('when there is no edit handler, should not show the pencils', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    expect(screen.queryByRole('button', { name: /Editar a categoria/ })).not.toBeInTheDocument();
  });

  it('when there is an edit handler, should give each visible category a pencil named after it', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} onEdit={() => {}} />);

    expect(
      screen.getByRole('button', { name: 'Editar a categoria Tecnologia' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Editar a categoria Culinária' }),
    ).toBeInTheDocument();
  });

  it('when the pencil is clicked, should hand the category over without selecting it', async () => {
    const onEdit = vi.fn();
    const onSelect = vi.fn();

    render(<CategoryTree nodes={tree} selected={[]} onSelect={onSelect} onEdit={onEdit} />);

    await userEvent.click(screen.getByRole('button', { name: 'Editar a categoria Culinária' }));

    expect(onEdit).toHaveBeenCalledWith(tree[1]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('when a subcategory is shown, should be editable too', async () => {
    const onEdit = vi.fn();

    render(
      <CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} onEdit={onEdit} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Editar a categoria Docker' }));

    expect(onEdit).toHaveBeenCalledWith(docker);
  });
});
