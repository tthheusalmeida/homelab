import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModuleDivider } from './ModuleDivider';

describe('ModuleDivider', () => {
  it('when rendered, should show the module title between two lines', () => {
    render(<ModuleDivider title="Módulo 1" />);

    const title = screen.getByRole('heading', { name: 'Módulo 1', level: 2 });

    expect(title.parentElement?.children).toHaveLength(3);
    expect(title).toHaveClass('uppercase');
  });

  it('when rendered, should take its colors from the separator color (not fixed theme grays)', () => {
    render(<ModuleDivider title="Módulo 1" />);

    const title = screen.getByRole('heading', { name: 'Módulo 1' });
    const [first, , last] = Array.from(title.parentElement!.children);

    expect(title).toHaveClass('reading-sep-text');
    expect(title.className).not.toContain('text-muted-foreground');
    expect(first).toHaveClass('reading-sep-line');
    expect(last).toHaveClass('reading-sep-line');
    expect(first.className).not.toContain('bg-border');
  });
});
