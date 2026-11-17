import type { ReactNode } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING } from '#shared/contracts/reading';
import { READING_SHADES } from '#lib/reading-shades';
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

  it('when the user chose font and size, should apply them to the area', async () => {
    saved({ font: 'literata', fontSize: 22 });

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() => expect(surface.style.fontSize).toBe('1.375rem'));
    expect(surface.style.fontFamily).toContain('Literata');
  });

  it('when the user zooms, should grow the letter and expose the zoom for the column', async () => {
    saved({ fontSize: 16, zoom: 150 });

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() => expect(surface.style.fontSize).toBe('1.5rem'));
    expect(surface.style.getPropertyValue('--reading-zoom')).toBe('1.5');
  });

  it('when the user chose colors and intensities, should use exactly those shades', async () => {
    saved({ background: 'amber', backgroundShade: 200, text: 'stone', textShade: 700 });

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() => expect(surface).toHaveAttribute('data-custom-bg'));
    expect(surface.style.getPropertyValue('--reading-bg')).toBe(READING_SHADES.amber[200]);
    expect(surface.style.getPropertyValue('--reading-fg')).toBe(READING_SHADES.stone[700]);
  });

  it('when the theme is dark, should keep the colors the user chose', async () => {
    saved({ background: 'amber', backgroundShade: 950 }, 'dark');

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() => expect(surface).toHaveAttribute('data-custom-bg'));
    expect(surface.style.getPropertyValue('--reading-bg')).toBe(READING_SHADES.amber[950]);
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

  it('when only the background is chosen, should write with the ink that reads on it even in the dark theme', async () => {
    saved({ background: 'amber', backgroundShade: 100 }, 'dark');

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() => expect(surface).toHaveAttribute('data-custom-bg'));
    expect(surface.style.getPropertyValue('--reading-fg')).toBe('oklch(0.22 0 0)');
    expect(surface.style.getPropertyValue('--reading-tab-bg')).toBe('oklch(0.22 0 0)');
  });

  it('when a separator color is chosen, should expose it for the dividers', async () => {
    saved({ separator: 'teal', separatorShade: 300 });

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() =>
      expect(surface.style.getPropertyValue('--reading-sep')).toBe(READING_SHADES.teal[300]),
    );
  });

  it('when nothing is customized, should leave the theme tokens alone', () => {
    render(<ReadingSurface>texto</ReadingSurface>);

    expect(screen.getByText('texto')).not.toHaveAttribute('data-custom-fg');
    expect(screen.getByText('texto')).not.toHaveAttribute('data-custom-bg');
  });

  it('when only the text color is chosen, should override the foreground tokens but not the background', async () => {
    saved({ text: 'indigo', textShade: 800 });

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() => expect(surface).toHaveAttribute('data-custom-fg'));
    expect(surface).not.toHaveAttribute('data-custom-bg');
  });

  it('when the background is chosen, should override both background and foreground tokens', async () => {
    saved({ background: 'amber', backgroundShade: 100 });

    withProvider(<ReadingSurface>texto</ReadingSurface>);

    const surface = screen.getByText('texto');

    await waitFor(() => expect(surface).toHaveAttribute('data-custom-bg'));
    expect(surface).toHaveAttribute('data-custom-fg');
    expect(surface.style.colorScheme).toBe('light');
  });
});
