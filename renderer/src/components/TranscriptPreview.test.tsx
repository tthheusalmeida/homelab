import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING } from '#shared/contracts/reading';
import { DEFAULT_TRANSCRIPT } from '#shared/contracts/document-views';
import { mockApi, ok } from '#test/api-mock';

import { AppearanceProvider } from './AppearanceProvider';
import { TranscriptPreview } from './TranscriptPreview';

const renderWith = (appearance: Partial<typeof DEFAULT_APPEARANCE> = {}) => {
  mockApi({ [IpcChannels.appearance.get]: () => ok({ ...DEFAULT_APPEARANCE, ...appearance }) });

  return render(
    <AppearanceProvider>
      <TranscriptPreview />
    </AppearanceProvider>,
  );
};

const region = () => screen.getByRole('region', { name: 'Pré-visualização da transcrição' });

describe('TranscriptPreview', () => {
  it('when shown, should draw the real timeline and the timed excerpts of a transcription', async () => {
    renderWith();

    await waitFor(() =>
      expect(
        within(region()).getByRole('complementary', { name: 'Trechos da transcrição' }),
      ).toBeInTheDocument(),
    );
    expect(within(region()).getByText('Linha do tempo')).toBeInTheDocument();
    expect(region().querySelectorAll('[data-excerpt]')).toHaveLength(4);
  });

  it('when the preview and progress options are on (default), should show the start of each excerpt and the progress bars', async () => {
    renderWith();

    await waitFor(() =>
      expect(region().querySelector('[data-slot=transcript-rail-preview]')).not.toBeNull(),
    );
    expect(within(region()).getAllByRole('progressbar').length).toBeGreaterThan(0);
  });

  it('when the options are off, should show only the times and no progress bars', async () => {
    renderWith({ transcript: { ...DEFAULT_TRANSCRIPT, preview: false, progress: false } });

    await waitFor(() =>
      expect(
        within(region()).getByRole('complementary', { name: 'Trechos da transcrição' }),
      ).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(region().querySelector('[data-slot=transcript-rail-preview]')).toBeNull(),
    );
    expect(within(region()).queryByRole('progressbar')).toBeNull();
  });

  it('when the sides are swapped, should put the timeline on the right of the text', async () => {
    renderWith({ reading: { ...DEFAULT_READING, swapSides: true } });

    await waitFor(() => expect(region().querySelector('.flex-row-reverse')).not.toBeNull());
  });

  it('when shown, should keep a fixed box that clips the overflow', () => {
    renderWith();

    expect(region()).toHaveClass('h-80', 'overflow-hidden');
  });
});
