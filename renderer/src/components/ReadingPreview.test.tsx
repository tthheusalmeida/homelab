import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING } from '#shared/contracts/reading';
import { mockApi, ok } from '#test/api-mock';

import { AppearanceProvider } from './AppearanceProvider';
import { ReadingPreview } from './ReadingPreview';

describe('ReadingPreview', () => {
  it('when shown, should use the same layout as the reading mode: module divider, chapter label, title and text', () => {
    render(<ReadingPreview />);

    expect(screen.getByRole('region', { name: 'Pré-visualização da leitura' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Módulo 1' })).toBeInTheDocument();
    expect(screen.getByText('Capítulo 1')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Texto de exemplo', level: 2 })).toBeInTheDocument();
    expect(screen.getByText(/Uma boa leitura começa/)).toBeInTheDocument();
  });

  it('when the preferences change, should show the sample with them', async () => {
    mockApi({
      [IpcChannels.appearance.get]: () =>
        ok({
          ...DEFAULT_APPEARANCE,
          reading: { ...DEFAULT_READING, fontSize: 24, background: 'sky' },
        }),
    });

    render(
      <AppearanceProvider>
        <ReadingPreview />
      </AppearanceProvider>,
    );

    const preview = screen.getByRole('region', { name: 'Pré-visualização da leitura' });

    await waitFor(() => expect(preview.style.fontSize).toBe('1.5rem'));
    expect(preview).toHaveAttribute('data-custom-bg');
  });

  const renderWith = (reading: Partial<typeof DEFAULT_READING>) => {
    mockApi({
      [IpcChannels.appearance.get]: () =>
        ok({ ...DEFAULT_APPEARANCE, reading: { ...DEFAULT_READING, ...reading } }),
    });

    return render(
      <AppearanceProvider>
        <ReadingPreview />
      </AppearanceProvider>,
    );
  };

  const sides = (container: HTMLElement, slot: string) =>
    [...container.querySelectorAll(`[data-slot=${slot}]`)].map((node) =>
      node.getAttribute('data-side'),
    );

  it('when the side panel is not pinned (default), should show a hover margin on each side and no button', () => {
    const { container } = render(<ReadingPreview />);

    expect(sides(container, 'preview-hover-area')).toEqual(['follow', 'options']);
    expect(container.querySelector('[data-slot=preview-side-panel]')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('when the side panel is pinned, should show both sides with their cards instead of the hover margins', async () => {
    const { container } = renderWith({ pinSidebar: true });

    await waitFor(() =>
      expect(sides(container, 'preview-side-panel')).toEqual(['follow', 'options']),
    );
    expect(container.querySelector('[data-slot=preview-hover-area]')).toBeNull();
    expect(screen.getByText('Sumário')).toBeInTheDocument();
    expect(screen.getByText('Leitura')).toBeInTheDocument();
    expect(screen.getByText('Sobre a página')).toBeInTheDocument();
  });

  it('when the sides are swapped, should put the options on the left and the follow on the right', async () => {
    const { container } = renderWith({ swapSides: true });

    await waitFor(() =>
      expect(sides(container, 'preview-hover-area')).toEqual(['options', 'follow']),
    );
  });

  it('when pinned and swapped, should mirror the cards too', async () => {
    const { container } = renderWith({ pinSidebar: true, swapSides: true });

    await waitFor(() =>
      expect(sides(container, 'preview-side-panel')).toEqual(['options', 'follow']),
    );
  });

  it('when not pinned, should reveal the cards only by hovering the margin, with a label while hidden', () => {
    const { container } = render(<ReadingPreview />);
    const area = container.querySelector('[data-slot=preview-hover-area]') as HTMLElement;

    expect(area).toHaveClass('group');
    expect(area.querySelector('.group-hover\\:opacity-0')).toHaveTextContent('Acompanhamento');
    expect(area.querySelector('.sidebar-card')).toBeInTheDocument();
  });

  it('when a margin is revealed, should open its cards inward so none is cut off by the frame', async () => {
    const { container } = render(<ReadingPreview />);
    const [left, right] = [...container.querySelectorAll('[data-slot=preview-hover-area]')];

    expect(left.querySelector('.sidebar-card')?.parentElement).toHaveClass('left-1');
    expect(right.querySelector('.sidebar-card')?.parentElement).toHaveClass('right-1');
    expect(right.querySelector('.sidebar-card')?.parentElement).not.toHaveClass('left-1');
  });

  describe('fidelity to the real reading mode', () => {
    it('when shown, should draw a header with the same soft chrome as the real one', () => {
      render(<ReadingPreview />);

      const header = screen.getByText('Título do livro').parentElement as HTMLElement;

      expect(header).toHaveClass('reading-chrome', 'border-b');
      expect(screen.getByText('Sair do modo leitura')).toBeInTheDocument();
    });

    it('when shown, should not scroll: everything is visible at once', () => {
      render(<ReadingPreview />);

      const surface = screen.getByRole('region', { name: 'Pré-visualização da leitura' });

      expect(surface.className).not.toContain('overflow-y-auto');
      expect(surface.className).not.toContain('overflow-y-scroll');
      expect(surface.className).not.toMatch(/max-h-/);
      expect(surface.querySelector('.overflow-y-auto')).toBeNull();
    });

    it('when the font, size or zoom grow, should keep a fixed box and clip the overflow so nothing below moves', () => {
      render(<ReadingPreview />);

      const surface = screen.getByRole('region', { name: 'Pré-visualização da leitura' });

      expect(surface).toHaveClass('h-80', 'overflow-hidden', 'min-w-0');
      expect(surface.querySelector('.reading-column')).toHaveClass('overflow-hidden', 'min-w-0');
    });

    it('when the cards are drawn, should use the same sidebar cards as the real reading mode', async () => {
      const { container } = renderWith({ pinSidebar: true });

      await waitFor(() =>
        expect(container.querySelectorAll('[data-slot=preview-side-panel] .sidebar-card')).toHaveLength(3),
      );
    });
  });
});
