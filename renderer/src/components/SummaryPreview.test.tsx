import { render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING } from '#shared/contracts/reading';
import { DEFAULT_SUMMARY } from '#shared/contracts/document-views';
import { mockApi, ok } from '#test/api-mock';

import { AppearanceProvider } from './AppearanceProvider';
import { SummaryPreview } from './SummaryPreview';

const renderWith = (appearance: Partial<typeof DEFAULT_APPEARANCE> = {}) => {
  mockApi({ [IpcChannels.appearance.get]: () => ok({ ...DEFAULT_APPEARANCE, ...appearance }) });

  return render(
    <AppearanceProvider>
      <SummaryPreview />
    </AppearanceProvider>,
  );
};

const region = () => screen.getByRole('region', { name: 'Pré-visualização do resumo' });

describe('SummaryPreview', () => {
  it('when the outline option is on (default), should show the summary with its titles and the text', () => {
    renderWith();

    const nav = within(region()).getByRole('navigation', { name: 'Sumário do exemplo' });

    expect(
      within(nav)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Ideia central', 'Conceitos', 'Aplicação']);
    expect(within(nav).getByRole('button', { name: 'Ideia central' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(
      within(region()).getByRole('heading', { name: 'Resumo de exemplo' }),
    ).toBeInTheDocument();
  });

  it('when the outline option is off, should show only the text', async () => {
    renderWith({ summary: { ...DEFAULT_SUMMARY, outline: false } });

    await waitFor(() =>
      expect(within(region()).queryByRole('navigation', { name: 'Sumário do exemplo' })).toBeNull(),
    );
    expect(within(region()).getByRole('heading', { name: 'Conceitos' })).toBeInTheDocument();
  });

  it('when the sides are swapped, should put the summary on the right of the text', async () => {
    renderWith({ reading: { ...DEFAULT_READING, swapSides: true } });

    await waitFor(() => expect(region().querySelector('.flex-row-reverse')).not.toBeNull());
  });

  it('when shown, should keep a fixed box that clips the overflow', () => {
    renderWith();

    expect(region()).toHaveClass('h-80', 'overflow-hidden');
  });
});
