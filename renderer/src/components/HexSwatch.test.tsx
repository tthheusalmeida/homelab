import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HexSwatch } from './HexSwatch';

describe('HexSwatch', () => {
  it('when rendered, should be a radio button with a hexagonal fill in the given color', () => {
    render(<HexSwatch selected={false} color="rgb(255, 0, 0)" aria-label="Vermelho" />);

    const radio = screen.getByRole('radio', { name: 'Vermelho' });
    const fill = radio.lastElementChild as HTMLElement;

    expect(radio).toHaveAttribute('data-slot', 'hex-swatch');
    expect(fill.style.backgroundColor).toBe('rgb(255, 0, 0)');
    expect(fill.className).toContain('clip-path:polygon(50%_0,100%_25%');
  });

  it('when selected, should be checked and show a hexagonal outline', () => {
    render(<HexSwatch selected color="red" aria-label="Vermelho" />);

    const radio = screen.getByRole('radio', { name: 'Vermelho' });

    expect(radio).toBeChecked();
    expect(radio.firstElementChild).toHaveClass('opacity-100');
    expect(radio.firstElementChild?.className).toContain('clip-path');
  });

  it('when not selected, should hide the outline', () => {
    render(<HexSwatch selected={false} color="red" aria-label="Vermelho" />);

    const radio = screen.getByRole('radio', { name: 'Vermelho' });

    expect(radio).not.toBeChecked();
    expect(radio.firstElementChild).not.toHaveClass('opacity-100');
  });

  it('when the fill comes from the theme, should use the class instead of a color', () => {
    render(<HexSwatch selected={false} fillClassName="bg-primary" aria-label="Ciano" />);

    expect(screen.getByRole('radio', { name: 'Ciano' }).lastElementChild).toHaveClass('bg-primary');
  });

  it('when small, should be smaller than the default size', () => {
    render(
      <>
        <HexSwatch selected={false} color="red" aria-label="a" />
        <HexSwatch selected={false} color="red" size="sm" aria-label="b" />
      </>,
    );

    expect(screen.getByRole('radio', { name: 'a' })).toHaveClass('h-6');
    expect(screen.getByRole('radio', { name: 'b' })).toHaveClass('h-5');
  });

  it('when clicked, should call onClick; a mark inside is shown', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <HexSwatch selected color="red" aria-label="Vermelho" onClick={onClick}>
        <span>marca</span>
      </HexSwatch>,
    );

    await user.click(screen.getByRole('radio', { name: 'Vermelho' }));

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText('marca')).toBeInTheDocument();
  });
});
