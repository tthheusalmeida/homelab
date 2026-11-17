import type { ReactNode } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING } from '#shared/contracts/reading';
import { mockApi, ok } from '#test/api-mock';

import { AppearanceProvider } from './AppearanceProvider';
import { ReadingSurface } from './ReadingSurface';

const withProvider = (ui: ReactNode) => render(<AppearanceProvider>{ui}</AppearanceProvider>);

const saved = (reading: Partial<typeof DEFAULT_READING>, theme = 'light') =>
  mockApi({
    [IpcChannels.appearance.get]: () =>
      ok({
        ...DEFAULT_APPEARANCE,
        theme,
        reading: { ...DEFAULT_READING, ...reading },
      }),
  });

describe('ReadingSurface', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('when there is no provider, should use the default font, size and colors', () => {
    render(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    expect(surface).toHaveClass('reading-surface');
    expect(surface).not.toHaveAttribute('data-custom-bg');
    expect(surface.style.fontSize).toBe('1rem');
    expect(surface.style.fontFamily).toBe('var(--font-sans)');
    expect(surface.style.getPropertyValue('--reading-zoom')).toBe('1');
    expect(surface.style.getPropertyValue('--reading-bg')).toBe('');
  });

  it('when the user chose font, size and zoom, should apply them to the area', async () => {
    saved({ font: 'literata', fontSize: 22, zoom: 130 });

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() => expect(surface.style.fontSize).toBe('1.375rem'));
    expect(surface.style.fontFamily).toContain('Literata');
    expect(surface.style.getPropertyValue('--reading-zoom')).toBe('1.3');
  });

  it('when the user chose a background and text color in a light theme, should set light-background and dark-text variables', async () => {
    saved({ background: 'amber', text: 'stone' }, 'light');

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() => expect(surface).toHaveAttribute('data-custom-bg'));
    expect(surface.style.getPropertyValue('--reading-bg')).toContain('oklch(98.7%');
    expect(surface.style.getPropertyValue('--reading-fg')).toContain('oklch(');
  });

  it('when the theme is dark, should pick the dark shades for the same colors', async () => {
    saved({ background: 'amber' }, 'dark');

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() => expect(surface).toHaveAttribute('data-custom-bg'));
    expect(surface.style.getPropertyValue('--reading-bg')).toContain('oklch(27.9%');
  });

  it('when it is framed (default), should mark it so the chosen background becomes a padded panel', () => {
    render(<ReadingSurface>texto</ReadingSurface>);

    expect(screen.getByText('texto')).toHaveAttribute('data-framed');
  });

  it('when it is not framed, should not mark it as a panel', () => {
    render(<ReadingSurface framed={false}>texto</ReadingSurface>);

    expect(screen.getByText('texto')).not.toHaveAttribute('data-framed');
  });

  it('when extra classes and props are given, should pass them on', () => {
    render(
      <ReadingSurface className="extra" role="region" aria-label="Leitura">
        texto
      </ReadingSurface>,
    );

    expect(screen.getByRole('region', { name: 'Leitura' })).toHaveClass('reading-surface', 'extra');
  });
});
