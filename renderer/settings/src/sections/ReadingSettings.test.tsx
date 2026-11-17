import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppearanceProvider } from '#components/AppearanceProvider';
import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING } from '#shared/contracts/reading';
import { failure, mockApi, ok, payloadsOf } from '#test/api-mock';

import { ReadingSettings } from './ReadingSettings';

function mockSaved(reading: Partial<typeof DEFAULT_READING> = {}) {
  let current = { ...DEFAULT_READING, ...reading };

  return mockApi({
    [IpcChannels.appearance.get]: () => ok({ ...DEFAULT_APPEARANCE, reading: current }),
    [IpcChannels.appearance.update]: (patch) => {
      current = { ...current, ...(patch as { reading: object }).reading };

      return ok({ ...DEFAULT_APPEARANCE, reading: current });
    },
  });
}

const renderSettings = () =>
  render(
    <AppearanceProvider>
      <ReadingSettings />
    </AppearanceProvider>,
  );

const group = (name: string) => within(screen.getByRole('radiogroup', { name }));

describe('ReadingSettings', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('when opened, should show the preview of how the text looks', () => {
    mockSaved();

    renderSettings();

    expect(screen.getByRole('region', { name: 'Pré-visualização da leitura' })).toBeInTheDocument();
    expect(screen.getByText('Texto de exemplo')).toBeInTheDocument();
  });

  it('when opened, should offer the five fonts and mark the saved one', async () => {
    mockSaved({ font: 'lora' });

    renderSettings();

    await waitFor(() => expect(group('Fonte').getByRole('radio', { name: 'Lora' })).toBeChecked());
    for (const name of ['Padrão', 'Literata', 'Merriweather', 'Atkinson']) {
      expect(group('Fonte').getByRole('radio', { name })).not.toBeChecked();
    }
  });

  it('when a font is clicked, should save it and show it as chosen', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderSettings();

    await user.click(group('Fonte').getByRole('radio', { name: 'Literata' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { reading: { font: 'literata' } },
    ]);
    expect(group('Fonte').getByRole('radio', { name: 'Literata' })).toBeChecked();
  });

  it('when the letter size is changed, should save steps of 2 and update the preview', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Aumentar a letra' }));
    await user.click(screen.getByRole('button', { name: 'Aumentar a letra' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { reading: { fontSize: 18 } },
      { reading: { fontSize: 20 } },
    ]);
    expect(screen.getByRole('region', { name: 'Pré-visualização da leitura' }).style.fontSize).toBe(
      '1.25rem',
    );
  });

  it('when the zoom is changed, should save steps of 10', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderSettings();

    await user.click(screen.getByRole('button', { name: 'Aumentar o zoom' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([{ reading: { zoom: 110 } }]);
    expect(screen.getByRole('status', { name: 'Zoom' })).toHaveTextContent('110%');
  });

  it('when a background color is picked, should save it and apply it to the preview', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderSettings();

    await user.click(group('Cor de fundo').getByRole('radio', { name: 'Âmbar' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { reading: { background: 'amber' } },
    ]);
    expect(screen.getByRole('region', { name: 'Pré-visualização da leitura' })).toHaveAttribute(
      'data-custom-bg',
    );
  });

  it('when a text color is picked, should save it apart from the background', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved({ background: 'sky' });
    renderSettings();

    await user.click(group('Cor do texto').getByRole('radio', { name: 'Pedra' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { reading: { text: 'stone' } },
    ]);
    await waitFor(() =>
      expect(group('Cor de fundo').getByRole('radio', { name: 'Céu' })).toBeChecked(),
    );
  });

  it('when everything is the default, should disable restoring the reading', async () => {
    mockSaved();

    renderSettings();

    expect(screen.getByRole('button', { name: /Restaurar leitura/ })).toBeDisabled();
  });

  it('when restoring, should save the default reading', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved({ font: 'lora', fontSize: 24, background: 'rose' });
    renderSettings();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Restaurar leitura/ })).toBeEnabled(),
    );

    await user.click(screen.getByRole('button', { name: /Restaurar leitura/ }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { reading: DEFAULT_READING },
    ]);
  });

  it('when the save fails, should show the message and keep the previous choice', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.appearance.get]: () => ok(DEFAULT_APPEARANCE),
      [IpcChannels.appearance.update]: () =>
        failure('VALIDATION', 'Escolha uma das fontes de leitura disponíveis.'),
    });
    renderSettings();

    await user.click(group('Fonte').getByRole('radio', { name: 'Lora' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('fontes de leitura');
    expect(group('Fonte').getByRole('radio', { name: 'Padrão' })).toBeChecked();
  });
});
