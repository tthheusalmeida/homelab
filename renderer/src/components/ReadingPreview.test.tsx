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
});
