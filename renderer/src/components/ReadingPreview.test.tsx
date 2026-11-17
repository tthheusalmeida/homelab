import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING } from '#shared/contracts/reading';
import { mockApi, ok } from '#test/api-mock';

import { AppearanceProvider } from './AppearanceProvider';
import { ReadingPreview } from './ReadingPreview';
import { ReadingSideToggle } from './ReadingSideToggle';

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

  it('when the side panel is not pinned (default), should show only the hover area on the right', () => {
    const { container } = render(<ReadingPreview />);

    expect(container.querySelector('[data-slot=preview-hover-area]')).toBeInTheDocument();
    expect(container.querySelector('[data-slot=preview-side-panel]')).toBeNull();
  });

  it('when the side panel is pinned, should show a mini panel instead of the hover area', async () => {
    mockApi({
      [IpcChannels.appearance.get]: () =>
        ok({
          ...DEFAULT_APPEARANCE,
          reading: { ...DEFAULT_READING, pinSidebar: true },
        }),
    });

    const { container } = render(
      <AppearanceProvider>
        <ReadingPreview />
      </AppearanceProvider>,
    );

    await waitFor(() =>
      expect(container.querySelector('[data-slot=preview-side-panel]')).toBeInTheDocument(),
    );
    expect(container.querySelector('[data-slot=preview-hover-area]')).toBeNull();
  });

  describe('fidelity to the real reading mode', () => {
    it('when shown, should draw a header with the same soft chrome as the real one', () => {
      render(<ReadingPreview />);

      const header = screen.getByText('Título do livro').parentElement as HTMLElement;

      expect(header).toHaveClass('reading-chrome', 'border-b');
      expect(screen.getByText('Sair do modo leitura')).toBeInTheDocument();
    });

    it('when the side panel is not pinned, should show the very same button as the real one, at the top right', () => {
      const { container } = render(<ReadingPreview />);

      const area = container.querySelector('[data-slot=preview-hover-area]') as HTMLElement;
      const button = area.firstElementChild as HTMLElement;
      const tab = button.firstElementChild as HTMLElement;

      expect(area).toHaveClass('top-9', 'right-5');
      expect(button).toHaveClass('pointer-events-none');
      expect(tab.className).toContain('bg-[var(--reading-tab-bg,var(--foreground))]');
      expect(tab.className).toContain('clip-path:polygon(50%_0');
    });

    it('when shown, should have exactly the same markup as the real toggle button', () => {
      const { container } = render(
        <>
          <ReadingPreview />
          <ReadingSideToggle />
        </>,
      );

      const preview = container.querySelector(
        '[data-slot=preview-hover-area] button',
      ) as HTMLElement;
      const real = container.querySelector('button:not([aria-hidden])') as HTMLElement;

      expect(preview.innerHTML).toBe(real.innerHTML);
    });

    it('when shown, should not scroll: everything is visible at once', () => {
      render(<ReadingPreview />);

      const surface = screen.getByRole('region', { name: 'Pré-visualização da leitura' });

      expect(surface.className).not.toContain('overflow-y-auto');
      expect(surface.className).not.toContain('overflow-y-scroll');
      expect(surface.className).not.toMatch(/max-h-/);
      expect(surface.querySelector('.overflow-y-auto')).toBeNull();
    });

    it('when the panel is hidden, should leave room for the button so it does not cover the text', () => {
      render(<ReadingPreview />);

      const column = screen.getByText('Texto de exemplo').closest('.reading-column') as HTMLElement;

      expect(column).toHaveClass('pr-14');
    });

    it('when the side panel is pinned, should mirror it with the chrome and the sidebar cards of the real one', async () => {
      mockApi({
        [IpcChannels.appearance.get]: () =>
          ok({
            ...DEFAULT_APPEARANCE,
            reading: { ...DEFAULT_READING, pinSidebar: true },
          }),
      });

      const { container } = render(
        <AppearanceProvider>
          <ReadingPreview />
        </AppearanceProvider>,
      );

      const panel = await waitFor(() => {
        const found = container.querySelector('[data-slot=preview-side-panel]');

        expect(found).toBeInTheDocument();

        return found as HTMLElement;
      });

      expect(panel).toHaveClass('reading-chrome');
      expect(panel.querySelectorAll('.sidebar-card')).toHaveLength(3);
      expect(screen.getByText('Conclusão')).toBeInTheDocument();
      expect(screen.getByText('Leitura')).toBeInTheDocument();
      expect(screen.getByText('Sumário')).toBeInTheDocument();
    });
  });
});
