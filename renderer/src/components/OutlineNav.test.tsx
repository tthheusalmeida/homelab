import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { OutlineNav } from './OutlineNav';

const items = [
  { id: 'a', label: 'Introdução', level: 1 },
  { id: 'b', label: 'Detalhes', level: 2 },
  { id: 'c', label: 'Fim' },
];

const renderNav = (props: Partial<React.ComponentProps<typeof OutlineNav>> = {}) =>
  render(<OutlineNav items={items} ariaLabel="Sumário" onSelect={() => {}} {...props} />);

describe('OutlineNav', () => {
  it('when rendered, should list every item inside a labeled nav', () => {
    renderNav();

    expect(screen.getByRole('navigation', { name: 'Sumário' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Introdução',
      'Detalhes',
      'Fim',
    ]);
  });

  it('when a title has a formula, should draw it instead of showing the dollars', () => {
    const { container } = renderNav({
      items: [{ id: 'f', label: 'Os primeiros $n$ termos de uma PG', level: 1 }],
    });

    expect(container.querySelector('.katex')).not.toBeNull();
    expect(screen.getByRole('button')).not.toHaveTextContent('$');
    expect(screen.getByRole('button')).toHaveTextContent('Os primeiros');
  });

  it('when an item is clicked, should report its id', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    renderNav({ onSelect });

    await user.click(screen.getByRole('button', { name: 'Detalhes' }));

    expect(onSelect).toHaveBeenCalledWith('b');
  });

  it('when an item is active, should mark and color only that one', () => {
    renderNav({ activeId: 'b' });

    const active = screen.getByRole('button', { name: 'Detalhes' });

    expect(active).toHaveAttribute('aria-current', 'location');
    expect(active).toHaveClass('text-foreground', 'font-semibold');
    expect(active.className).not.toContain('bg-foreground');
    expect(screen.getByRole('button', { name: 'Fim' })).not.toHaveAttribute('aria-current');
  });

  it('when an item is active, should color earlier markers green and the current one with the accent', () => {
    renderNav({ activeId: 'b' });

    const marker = (name: string) =>
      screen.getByRole('button', { name }).querySelector('span[aria-hidden]');

    expect(marker('Introdução')).toHaveClass('bg-emerald-500');
    expect(marker('Detalhes')).toHaveClass('bg-primary');
    expect(marker('Fim')).not.toHaveClass('bg-emerald-500', 'bg-primary');
  });

  it('when no item is active, should mark none', () => {
    renderNav();

    expect(document.querySelector('[aria-current]')).not.toBeInTheDocument();
  });

  it('when levels differ, should indent deeper ones and treat a missing level as the first', () => {
    renderNav();

    const indent = (name: string) => screen.getByRole('button', { name }).closest('li');

    expect(indent('Introdução')).toHaveStyle({ paddingLeft: '0rem' });
    expect(indent('Detalhes')).toHaveStyle({ paddingLeft: '0.875rem' });
    expect(indent('Fim')).toHaveStyle({ paddingLeft: '0rem' });
  });

  describe('hierarchy', () => {
    const deep = [
      { id: 'a', label: 'Título', level: 1 },
      { id: 'b', label: 'Subtítulo', level: 2 },
      { id: 'c', label: 'Sub-subtítulo', level: 3 },
      { id: 'd', label: 'Nível fundo', level: 5 },
    ];

    const button = (name: string) => screen.getByRole('button', { name });

    it('when a title is shown, should be bold and in the full text color', () => {
      renderNav({ items: deep });

      expect(button('Título')).toHaveClass('font-bold', 'text-foreground', 'text-sm');
    });

    it('when a subtitle is shown, should be medium weight and softer than the title', () => {
      renderNav({ items: deep });

      expect(button('Subtítulo')).toHaveClass('font-medium', 'text-foreground/75');
      expect(button('Subtítulo')).not.toHaveClass('font-bold');
    });

    it('when a sub-subtitle is shown, should be smaller, light and faded', () => {
      renderNav({ items: deep });

      expect(button('Sub-subtítulo')).toHaveClass(
        'text-xs',
        'font-normal',
        'text-muted-foreground',
      );
    });

    it('when a level is deeper than 3, should be treated as the third', () => {
      renderNav({ items: deep });

      expect(button('Nível fundo')).toHaveClass('text-xs', 'font-normal');
      expect(button('Nível fundo').closest('li')).toHaveAttribute('data-level', '3');
    });

    it('when levels go deeper, should indent each one more than the previous', () => {
      renderNav({ items: deep });

      const pad = (name: string) =>
        parseFloat((button(name).closest('li') as HTMLElement).style.paddingLeft);

      expect(pad('Título')).toBeLessThan(pad('Subtítulo'));
      expect(pad('Subtítulo')).toBeLessThan(pad('Sub-subtítulo'));
    });

    it('when a new title starts after other items, should open a group with extra space above', () => {
      renderNav({
        items: [
          { id: 'a', label: 'Primeiro', level: 1 },
          { id: 'b', label: 'Filho', level: 2 },
          { id: 'c', label: 'Segundo', level: 1 },
        ],
      });

      expect(button('Segundo').closest('li')).toHaveClass('mt-2.5');
      expect(button('Filho').closest('li')?.className).not.toContain('mt-2.5');
    });

    it('when an item is active, should override its level style with the highlight', () => {
      renderNav({ items: deep, activeId: 'c' });

      expect(button('Sub-subtítulo')).toHaveClass(
        'font-semibold',
        'text-foreground',
      );
    });
  });

  describe('active item contrast', () => {
    it('when an item is active, should use bold and the full text color, with no background, not only the accent color', () => {
      renderNav({ activeId: 'a' });

      const active = screen.getByRole('button', { name: 'Introdução' });

      expect(active).toHaveClass('text-foreground', 'font-semibold');
      expect(active.className).not.toContain('text-primary');
      expect(active.className).not.toContain('bg-foreground');
    });

    it('when an item is active, should not draw any colored border or bar', () => {
      renderNav({ activeId: 'a' });

      const className = screen.getByRole('button', { name: 'Introdução' }).className;

      expect(className).not.toContain('shadow-[inset');
      expect(className).not.toContain('border-primary');
      expect(className).not.toContain('border-l');
    });

    it('when an item is not active, should not carry the highlight', () => {
      renderNav({ activeId: 'a' });

      expect(screen.getByRole('button', { name: 'Detalhes' }).className).not.toContain(
        'font-semibold',
      );
    });
  });
});
