import type { ReactNode } from 'react';

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { AppearanceProvider } from '#components/AppearanceProvider';
import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import { AppearanceSection } from './AppearanceSection';

const renderSection = (ui: ReactNode = <AppearanceSection />) =>
  render(<AppearanceProvider>{ui}</AppearanceProvider>);

/** As cores de destaque e as de leitura têm nomes parecidos: sempre procure dentro do grupo. */
const accents = () => within(screen.getByRole('radiogroup', { name: 'Cor de destaque' }));

describe('AppearanceSection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('when opened, should offer the three themes and mark the saved one', async () => {
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: 'dark', accent: 'cyan' }) });

    renderSection();

    expect(screen.getByRole('radio', { name: 'Sistema' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Escuro' })).toBeChecked());
  });

  it('when opened, should offer the fifteen accent colors and mark the saved one', async () => {
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: 'system', accent: 'violet' }) });

    renderSection();

    await waitFor(() => expect(accents().getByRole('radio', { name: 'Violeta' })).toBeChecked());
    expect(accents().getAllByRole('radio')).toHaveLength(15);
    for (const name of ['Ciano', 'Azul', 'Índigo', 'Esmeralda', 'Rosé', 'Laranja', 'Amarelo']) {
      expect(accents().getByRole('radio', { name })).not.toBeChecked();
    }
  });

  it('when listing the accent colors, should order them from the warmest to the coldest', () => {
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: 'system', accent: 'cyan' }) });

    renderSection();

    expect(
      accents()
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label')),
    ).toEqual([
      'Rosa',
      'Rosé',
      'Vermelho',
      'Laranja',
      'Âmbar',
      'Amarelo',
      'Lima',
      'Verde',
      'Esmeralda',
      'Azul-petróleo',
      'Ciano',
      'Céu',
      'Azul',
      'Índigo',
      'Violeta',
    ]);
  });

  it('when a theme is clicked, should save it and apply it to the app', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.appearance.get]: () => ok({ theme: 'system', accent: 'cyan' }),
      [IpcChannels.appearance.update]: () => ok({ theme: 'dark', accent: 'cyan' }),
    });
    renderSection();

    await user.click(screen.getByRole('radio', { name: 'Escuro' }));

    expect(invoke).toHaveBeenCalledWith(IpcChannels.appearance.update, { theme: 'dark' });
    expect(document.documentElement).toHaveClass('dark');
  });

  it('when an accent color is clicked, should save it and apply it to the app', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.appearance.get]: () => ok({ theme: 'system', accent: 'cyan' }),
      [IpcChannels.appearance.update]: () => ok({ theme: 'system', accent: 'rose' }),
    });
    renderSection();

    await user.click(accents().getByRole('radio', { name: 'Rosé' }));

    expect(invoke).toHaveBeenCalledWith(IpcChannels.appearance.update, { accent: 'rose' });
    await waitFor(() => expect(document.documentElement.dataset.accent).toBe('rose'));
  });

  it('when the save fails, should show the message and keep the previous choice', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.appearance.get]: () => ok({ theme: 'system', accent: 'cyan' }),
      [IpcChannels.appearance.update]: () => failure('VALIDATION', 'Escolha uma cor válida.'),
    });
    renderSection();

    await user.click(accents().getByRole('radio', { name: 'Laranja' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Escolha uma cor válida.');
    expect(accents().getByRole('radio', { name: 'Ciano' })).toBeChecked();
  });

  it('when the default is already in use, should disable restoring it', async () => {
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: 'system', accent: 'cyan' }) });

    renderSection();

    expect(screen.getByRole('button', { name: /Restaurar padrão/ })).toBeDisabled();
  });

  it('when restoring the default, should save system and cyan', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.appearance.get]: () => ok({ theme: 'dark', accent: 'orange' }),
      [IpcChannels.appearance.update]: () => ok({ theme: 'system', accent: 'cyan' }),
    });
    renderSection();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Restaurar padrão/ })).toBeEnabled(),
    );

    await user.click(screen.getByRole('button', { name: /Restaurar padrão/ }));

    expect(invoke).toHaveBeenCalledWith(IpcChannels.appearance.update, {
      theme: 'system',
      accent: 'cyan',
    });
  });
});

describe('AppearanceSection spacing', () => {
  it('when opened, should keep Tema, Leitura, Transcrição and Resumo in one stack spaced by 24px', () => {
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: 'system', accent: 'cyan' }) });

    renderSection();

    const stack = screen.getByRole('region', { name: 'Tema' }).parentElement;

    expect(stack).toHaveClass('gap-6');
    for (const name of ['Leitura', 'Transcrição', 'Resumo']) {
      expect(screen.getByRole('region', { name }).parentElement).toBe(stack);
    }
  });
});
