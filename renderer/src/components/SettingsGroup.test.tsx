import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { SettingsGroup, SettingsPanel, SettingsStack } from './SettingsGroup';

describe('SettingsGroup', () => {
  it('when rendered, should expose a region named by the title with the hint and content', () => {
    render(
      <SettingsGroup title="Tema" hint="Sistema acompanha o Windows.">
        <p>conteúdo</p>
      </SettingsGroup>,
    );

    expect(screen.getByRole('region', { name: 'Tema' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Tema' })).toBeInTheDocument();
    expect(screen.getByText('Sistema acompanha o Windows.')).toBeInTheDocument();
    expect(screen.getByText('conteúdo')).toBeInTheDocument();
  });

  it('when there is no hint, should render only the title', () => {
    render(
      <SettingsGroup title="Sozinho">
        <span />
      </SettingsGroup>,
    );

    expect(screen.getByRole('heading', { name: 'Sozinho' }).nextElementSibling).toBeNull();
  });
});

describe('SettingsPanel', () => {
  it('when highlighted, should use the accent border', () => {
    render(<SettingsPanel highlight data-testid="painel" />);

    expect(screen.getByTestId('painel').className).toContain('border-primary/40');
  });

  it('when not highlighted, should keep the neutral border', () => {
    render(<SettingsPanel data-testid="painel" />);

    expect(screen.getByTestId('painel').className).not.toContain('border-primary/40');
  });
});

describe('SettingsStack', () => {
  it('when stacking groups, should space them by 24px (gap-6) in a column', () => {
    render(
      <SettingsStack data-testid="stack">
        <SettingsGroup title="Tema">
          <span />
        </SettingsGroup>
        <SettingsGroup title="Leitura">
          <span />
        </SettingsGroup>
      </SettingsStack>,
    );

    expect(screen.getByTestId('stack')).toHaveClass('flex', 'flex-col', 'gap-6');
  });

  it('when a class is given, should keep the standard spacing and add it', () => {
    render(<SettingsStack data-testid="stack" className="max-w-sm" />);

    expect(screen.getByTestId('stack')).toHaveClass('gap-6', 'max-w-sm');
  });
});
