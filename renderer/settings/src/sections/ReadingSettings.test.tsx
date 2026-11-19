import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppearanceProvider } from '#components/AppearanceProvider';
import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING, READING_SHADES_LIST } from '#shared/contracts/reading';
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

  it('when a color is picked, should then offer its intensity as a slider and save the one chosen', async () => {
    const invoke = mockSaved({ background: 'sky' });
    renderSettings();

    const slider = await screen.findByRole('slider', { name: 'Intensidade: Cor de fundo' });

    expect(slider).toHaveAttribute('aria-valuetext', '50');

    fireEvent.change(slider, { target: { value: String(READING_SHADES_LIST.indexOf(800)) } });

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
        { reading: { backgroundShade: 800 } },
      ]),
    );
    expect(slider).toHaveAttribute('aria-valuetext', '800');
  });

  it('when the colors are the default, should not offer an intensity', () => {
    mockSaved();

    renderSettings();

    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });

  it('when the text and background intensities are chosen, should keep them apart', async () => {
    const invoke = mockSaved({ background: 'stone', text: 'stone' });
    renderSettings();

    const text = await screen.findByRole('slider', { name: 'Intensidade: Cor do texto' });

    fireEvent.change(text, { target: { value: String(READING_SHADES_LIST.indexOf(700)) } });

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
        { reading: { textShade: 700 } },
      ]),
    );
    expect(screen.getByRole('slider', { name: 'Intensidade: Cor de fundo' })).toHaveAttribute(
      'aria-valuetext',
      '50',
    );
  });

  it('when opened, should offer a separator color picker beside the background and text ones', () => {
    mockSaved();

    renderSettings();

    expect(screen.getByRole('radiogroup', { name: 'Cor dos separadores' })).toBeInTheDocument();
  });

  it('when a separator color is picked, should save it with its intensity apart from the others', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderSettings();

    await user.click(group('Cor dos separadores').getByRole('radio', { name: 'Âmbar' }));

    const slider = await screen.findByRole('slider', { name: 'Intensidade: Cor dos separadores' });

    expect(slider).toHaveAttribute('aria-valuetext', '500');

    fireEvent.change(slider, { target: { value: String(READING_SHADES_LIST.indexOf(300)) } });

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
        { reading: { separator: 'amber' } },
        { reading: { separatorShade: 300 } },
      ]),
    );
  });

  it('when opened, should show the subtitle of the reading group', () => {
    mockSaved();

    renderSettings();

    expect(
      screen.getByText('Como o texto aparece nas páginas e nos livros, inclusive no modo leitura.'),
    ).toBeInTheDocument();
  });

  it('when the color options are listed, should order them from the warmest to the coldest with the default first and the neutral last', () => {
    mockSaved();

    renderSettings();

    const labels = within(screen.getByRole('radiogroup', { name: 'Cor de fundo' }))
      .getAllByRole('radio')
      .map((radio) => radio.getAttribute('aria-label'));

    expect(labels[0]).toBe('Padrão');
    expect(labels.slice(1, 4)).toEqual(['Rosé', 'Vermelho', 'Laranja']);
    expect(labels[labels.length - 2]).toBe('Violeta');
    expect(labels[labels.length - 1]).toBe('Pedra');
  });

  it('when the color options are listed, should offer only 15 colors beside the default', () => {
    mockSaved();

    renderSettings();

    expect(
      within(screen.getByRole('radiogroup', { name: 'Cor de fundo' })).getAllByRole('radio'),
    ).toHaveLength(16);
  });

  it('when the zoom grows, should grow the letter in the preview too, like a pdf', async () => {
    const user = userEvent.setup();
    mockSaved();
    renderSettings();

    for (let i = 0; i < 5; i += 1) {
      await user.click(screen.getByRole('button', { name: 'Aumentar o zoom' }));
    }

    expect(screen.getByRole('status', { name: 'Zoom' })).toHaveTextContent('150%');
    expect(screen.getByRole('region', { name: 'Pré-visualização da leitura' }).style.fontSize).toBe(
      '1.5rem',
    );
  });

  it('when opened, should leave the side panel unpinned and show only the hover area in the preview', () => {
    mockSaved();

    renderSettings();

    expect(screen.getByRole('checkbox', { name: 'Sempre visível na leitura' })).not.toBeChecked();
    expect(document.querySelector('[data-slot=preview-hover-area]')).toBeInTheDocument();
  });

  it('when the side panel option is checked, should save it and show the pinned panel in the preview', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderSettings();

    await user.click(screen.getByRole('checkbox', { name: 'Sempre visível na leitura' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { reading: { pinSidebar: true } },
    ]);
    expect(screen.getByRole('checkbox', { name: 'Sempre visível na leitura' })).toBeChecked();
    expect(document.querySelector('[data-slot=preview-side-panel]')).toBeInTheDocument();
    expect(document.querySelector('[data-slot=preview-hover-area]')).toBeNull();
  });

  it('when the side panel is pinned and unchecked again, should go back to the hover area', async () => {
    const user = userEvent.setup();
    mockSaved({ pinSidebar: true });
    renderSettings();
    const box = screen.getByRole('checkbox', { name: 'Sempre visível na leitura' });
    await waitFor(() => expect(box).toBeChecked());

    await user.click(box);

    expect(box).not.toBeChecked();
    expect(document.querySelector('[data-slot=preview-hover-area]')).toBeInTheDocument();
  });

  it('when opened, should leave the sides as they are and show follow on the left in the preview', () => {
    mockSaved();

    renderSettings();

    expect(screen.getByRole('checkbox', { name: 'Inverter os lados' })).not.toBeChecked();
    expect(
      [...document.querySelectorAll('[data-slot=preview-hover-area]')].map((n) =>
        n.getAttribute('data-side'),
      ),
    ).toEqual(['follow', 'options']);
  });

  it('when swap sides is checked, should save it and mirror the preview', async () => {
    const user = userEvent.setup();
    const invoke = mockSaved();
    renderSettings();

    await user.click(screen.getByRole('checkbox', { name: 'Inverter os lados' }));

    expect(payloadsOf(invoke, IpcChannels.appearance.update)).toEqual([
      { reading: { swapSides: true } },
    ]);
    expect(screen.getByRole('checkbox', { name: 'Inverter os lados' })).toBeChecked();
    expect(
      [...document.querySelectorAll('[data-slot=preview-hover-area]')].map((n) =>
        n.getAttribute('data-side'),
      ),
    ).toEqual(['options', 'follow']);
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
