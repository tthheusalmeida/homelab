import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppearanceProvider } from '#components/AppearanceProvider';
import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_SUMMARY } from '#shared/contracts/document-views';
import { mockApi, ok, payloadsOf } from '#test/api-mock';

import { SummarySettings } from './SummarySettings';

function mockSaved(summary: Partial<typeof DEFAULT_SUMMARY> = {}) {
  let current = { ...DEFAULT_SUMMARY, ...summary };

  return mockApi({
    [IpcChannels.appearance.get]: () => ok({ ...DEFAULT_APPEARANCE, summary: current }),
    [IpcChannels.appearance.update]: (patch) => {
      current = { ...current, ...(patch as { summary: object }).summary };

      return ok({ ...DEFAULT_APPEARANCE, summary: current });
    },
  });
}

const renderSettings = () =>
  render(
    <AppearanceProvider>
      <SummarySettings />
    </AppearanceProvider>,
  );

describe('SummarySettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('when opened, should show the summary preview with its outline', () => {
    mockSaved();

    renderSettings();

    expect(screen.getByRole('region', { name: 'Pré-visualização do resumo' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Sumário do exemplo' })).toBeInTheDocument();
  });

  it('when "Mostrar o sumário ao lado do texto" is unchecked, should hide the outline in the preview', async () => {
    const user = userEvent.setup();
    mockSaved();
    renderSettings();

    await user.click(screen.getByRole('checkbox', { name: 'Mostrar o sumário ao lado do texto' }));

    await waitFor(() =>
      expect(screen.queryByRole('navigation', { name: 'Sumário do exemplo' })).toBeNull(),
    );
  });

  it('when opened, should have the "Mostrar o sumário ao lado do texto" option on by default', () => {
    mockSaved();

    renderSettings();

    expect(
      screen.getByRole('checkbox', { name: 'Mostrar o sumário ao lado do texto' }),
    ).toBeChecked();
  });

  it('when "Mostrar o sumário ao lado do texto" is unchecked, should save only that field', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderSettings();

    await user.click(screen.getByRole('checkbox', { name: 'Mostrar o sumário ao lado do texto' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { summary: { outline: false } },
    ]);
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar o sumário ao lado do texto' }),
    ).not.toBeChecked();
  });

  it('when the saved "Mostrar o sumário ao lado do texto" option is off, should open unchecked and allow turning it on', async () => {
    const user = userEvent.setup();
    mockSaved({ outline: false });
    renderSettings();
    const box = screen.getByRole('checkbox', { name: 'Mostrar o sumário ao lado do texto' });
    await waitFor(() => expect(box).not.toBeChecked());

    await user.click(box);

    expect(box).toBeChecked();
  });

  it('when everything is the default, should disable restoring', async () => {
    mockSaved();

    renderSettings();

    expect(screen.getByRole('button', { name: /Restaurar resumo/ })).toBeDisabled();
  });

  it('when something was changed, should restore the defaults', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved({ outline: false });
    renderSettings();
    const restore = screen.getByRole('button', { name: /Restaurar resumo/ });
    await waitFor(() => expect(restore).toBeEnabled());

    await user.click(restore);

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { summary: DEFAULT_SUMMARY },
    ]);
  });
});
