import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ReadingSideToggle } from './ReadingSideToggle';

describe('ReadingSideToggle', () => {
  it('when rendered, should be a button with the hexagonal tab inside', () => {
    render(<ReadingSideToggle />);

    const button = screen.getByRole('button', { name: 'Mostrar painel lateral' });

    expect(button).toHaveAttribute('title', 'Clique para abrir o painel');
    expect(button.firstElementChild?.className).toContain('clip-path:polygon(50%_0');
    expect(button.querySelector('svg')).toBeInTheDocument();
  });

  it('when the panel is open or not, should say so', () => {
    const { rerender } = render(<ReadingSideToggle open />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');

    rerender(<ReadingSideToggle />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('when clicked, should call onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ReadingSideToggle onClick={onClick} />);

    await user.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('when a position is given, should apply it without changing the look', () => {
    render(<ReadingSideToggle className="fixed top-[4.5rem] right-5" />);

    expect(screen.getByRole('button')).toHaveClass('fixed', 'top-[4.5rem]', 'right-5', 'group');
  });

  it('when in the preview, should be the same button but inert and hidden from screen readers', () => {
    render(<ReadingSideToggle preview />);

    const button = screen.getByRole('button', { hidden: true });

    expect(button).toHaveAttribute('aria-hidden', 'true');
    expect(button).toHaveAttribute('tabindex', '-1');
    expect(button).toHaveClass('pointer-events-none');
    expect(button.firstElementChild?.className).toContain('clip-path:polygon(50%_0');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('when real and preview are rendered, should share the same visual', () => {
    const { container } = render(
      <>
        <ReadingSideToggle />
        <ReadingSideToggle preview />
      </>,
    );

    const [real, preview] = Array.from(container.querySelectorAll('button'));

    expect(preview.innerHTML).toBe(real.innerHTML);
  });
});
