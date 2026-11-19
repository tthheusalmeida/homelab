import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppearanceProvider } from '#components/AppearanceProvider';
import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_TRANSCRIPT } from '#shared/contracts/document-views';
import { mockApi, ok, payloadsOf } from '#test/api-mock';

import { TranscriptSettings } from './TranscriptSettings';

function mockSaved(transcript: Partial<typeof DEFAULT_TRANSCRIPT> = {}) {
  let current = { ...DEFAULT_TRANSCRIPT, ...transcript };

  return mockApi({
    [IpcChannels.appearance.get]: () => ok({ ...DEFAULT_APPEARANCE, transcript: current }),
    [IpcChannels.appearance.update]: (patch) => {
      current = { ...current, ...(patch as { transcript: object }).transcript };

      return ok({ ...DEFAULT_APPEARANCE, transcript: current });
    },
  });
}

const renderSettings = () =>
  render(
    <AppearanceProvider>
      <TranscriptSettings />
    </AppearanceProvider>,
  );

describe('TranscriptSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('when opened, should show the transcript preview with the timeline', async () => {
    mockSaved();

    renderSettings();

    expect(screen.getByRole('region', { name: 'Pré-visualização da transcrição' })).toBeInTheDocument();
    await waitFor(() =>
      expect(document.querySelector('[data-slot=transcript-rail-preview]')).toBeInTheDocument(),
    );
  });

  it('when "Mostrar o começo dos trechos" is unchecked, should hide the excerpt starts in the preview', async () => {
    const user = userEvent.setup();
    mockSaved();
    renderSettings();
    await waitFor(() =>
      expect(document.querySelector('[data-slot=transcript-rail-preview]')).toBeInTheDocument(),
    );

    await user.click(screen.getByRole('checkbox', { name: 'Mostrar o começo dos trechos' }));

    await waitFor(() =>
      expect(document.querySelector('[data-slot=transcript-rail-preview]')).toBeNull(),
    );
  });

  it('when opened, should have the "Mostrar o começo dos trechos" option on by default', () => {
    mockSaved();

    renderSettings();

    expect(screen.getByRole('checkbox', { name: 'Mostrar o começo dos trechos' })).toBeChecked();
  });

  it('when "Mostrar o começo dos trechos" is unchecked, should save only that field', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderSettings();

    await user.click(screen.getByRole('checkbox', { name: 'Mostrar o começo dos trechos' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { transcript: { preview: false } },
    ]);
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar o começo dos trechos' }),
    ).not.toBeChecked();
  });

  it('when the saved "Mostrar o começo dos trechos" option is off, should open unchecked and allow turning it on', async () => {
    const user = userEvent.setup();
    mockSaved({ preview: false });
    renderSettings();
    const box = screen.getByRole('checkbox', { name: 'Mostrar o começo dos trechos' });
    await waitFor(() => expect(box).not.toBeChecked());

    await user.click(box);

    expect(box).toBeChecked();
  });

  it('when opened, should have the "Mostrar a barra de progresso de cada trecho" option on by default', () => {
    mockSaved();

    renderSettings();

    expect(
      screen.getByRole('checkbox', { name: 'Mostrar a barra de progresso de cada trecho' }),
    ).toBeChecked();
  });

  it('when "Mostrar a barra de progresso de cada trecho" is unchecked, should save only that field', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderSettings();

    await user.click(
      screen.getByRole('checkbox', { name: 'Mostrar a barra de progresso de cada trecho' }),
    );

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { transcript: { progress: false } },
    ]);
    expect(
      screen.getByRole('checkbox', { name: 'Mostrar a barra de progresso de cada trecho' }),
    ).not.toBeChecked();
  });

  it('when the saved "Mostrar a barra de progresso de cada trecho" option is off, should open unchecked and allow turning it on', async () => {
    const user = userEvent.setup();
    mockSaved({ progress: false });
    renderSettings();
    const box = screen.getByRole('checkbox', {
      name: 'Mostrar a barra de progresso de cada trecho',
    });
    await waitFor(() => expect(box).not.toBeChecked());

    await user.click(box);

    expect(box).toBeChecked();
  });

  it('when everything is the default, should disable restoring', async () => {
    mockSaved();

    renderSettings();

    expect(screen.getByRole('button', { name: /Restaurar transcrição/ })).toBeDisabled();
  });

  it('when something was changed, should restore the defaults', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved({ preview: false });
    renderSettings();
    const restore = screen.getByRole('button', { name: /Restaurar transcrição/ });
    await waitFor(() => expect(restore).toBeEnabled());

    await user.click(restore);

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { transcript: DEFAULT_TRANSCRIPT },
    ]);
  });
});
