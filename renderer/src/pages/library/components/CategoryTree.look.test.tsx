import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

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

const hexOf = (button: HTMLElement) => button.querySelector('[class*="clip-path"]') as HTMLElement;
const row = (name: RegExp) => screen.getByRole('button', { name });

describe('CategoryTree: visual Colmeia', () => {
  it('when rendered, should label the panel in mono and draw the brand hexagons on the root', () => {
    const { container } = render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    expect(screen.getByText('categorias')).toHaveClass('font-mono');
    expect(row(/^Todas as categorias/).querySelector('svg')).not.toBeNull();
    expect(container.querySelector('nav')).toHaveClass('border', 'bg-card');
  });

  it('when a category has subcategories, should draw its hexagon filled; without them, faded', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    expect(hexOf(row(/^Tecnologia/))).toHaveClass('bg-muted-foreground');
    expect(hexOf(row(/^Culinária/))).toHaveClass('bg-muted-foreground/35');
  });

  it('when a category is selected, should paint its hexagon in the accent color and highlight the row', () => {
    render(<CategoryTree nodes={tree} selected={['Culinária']} onSelect={() => {}} />);

    expect(hexOf(row(/^Culinária/))).toHaveClass('bg-primary');
    expect(row(/^Culinária/).parentElement).toHaveClass('bg-primary/15');
    expect(row(/^Tecnologia/).parentElement).not.toHaveClass('bg-primary/15');
  });

  it('when all categories are the choice, should highlight that row', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    expect(row(/^Todas as categorias/)).toHaveClass('bg-primary/15');
  });

  it('when a level is open, should join it to its parent with a dashed line', () => {
    const { container } = render(
      <CategoryTree nodes={tree} selected={['Tecnologia']} onSelect={() => {}} />,
    );
    const nested = container.querySelector('li ul') as HTMLElement;

    expect(nested).toHaveClass('border-l', 'border-dashed');
    expect(nested).toContainElement(row(/^Docker/));
  });

  it('when showing the count, should write it in mono', () => {
    render(<CategoryTree nodes={tree} selected={[]} onSelect={() => {}} />);

    expect(
      (row(/^Tecnologia/).parentElement as HTMLElement).querySelector('.font-mono'),
    ).toHaveTextContent('2');
  });
});
