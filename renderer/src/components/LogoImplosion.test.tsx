import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { LogoImplosion } from './LogoImplosion';

describe('LogoImplosion', () => {
  it('when rendered, should hide from screen readers as a decoration', () => {
    render(<LogoImplosion />);

    expect(screen.getByTestId('logo-implosion')).toHaveAttribute('aria-hidden', 'true');
  });

  it('when rendered, should draw the three hexagons of the logo with one in the accent color', () => {
    render(<LogoImplosion />);

    const hexes = screen.getByTestId('logo-hexes');

    expect(hexes.querySelectorAll('path')).toHaveLength(3);
    expect(hexes.querySelectorAll('path.fill-brand')).toHaveLength(1);
    expect(hexes.querySelectorAll('path.fill-foreground')).toHaveLength(2);
  });

  it('when rendered, should implode the set and spin each hexagon around itself', () => {
    render(<LogoImplosion />);

    const hexes = screen.getByTestId('logo-hexes');
    const spinning = hexes.querySelectorAll('.animate-hex-spin');

    expect(hexes.className).toContain('animate-implosion');
    expect(spinning).toHaveLength(3);
    // Cada hexágono gira em torno do próprio centro, não do quadro todo.
    expect(
      new Set([...spinning].map((hex) => (hex as HTMLElement).style.transformOrigin)).size,
    ).toBe(3);
  });

  it('when rendered, should flash at the critical point', () => {
    render(<LogoImplosion />);

    expect(screen.getByTestId('logo-critical').className).toContain('animate-critical');
  });

  it('when a ref is given, should point it at the box whose center is the critical point', () => {
    const ref = createRef<HTMLDivElement>();

    render(<LogoImplosion ref={ref} />);

    expect(ref.current).toBe(screen.getByTestId('logo-implosion'));
  });
});
