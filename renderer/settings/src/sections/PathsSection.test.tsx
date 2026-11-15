import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok, payloadsOf, renderWithProviders } from '../testing';

import { PathsSection } from './PathsSection';

const paths = {
  libraryDir: 'D:/lib',
  inboxDir: 'D:/inbox',
  videoTempDir: 'D:/tmp/video',
  audioTempDir: 'D:/tmp/audio',
};

describe('PathsSection', () => {
  it('when loaded, should show every folder with its current value', async () => {
    mockApi({ [IpcChannels.settings.get]: () => ok(paths) });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);

    expect(await screen.findByLabelText('Biblioteca')).toHaveValue('D:/lib');
    expect(screen.getByLabelText('Entrada')).toHaveValue('D:/inbox');
    expect(screen.getByLabelText('Vídeos temporários')).toHaveValue('D:/tmp/video');
    expect(screen.getByLabelText('Áudios temporários')).toHaveValue('D:/tmp/audio');
  });

  it('when nothing was edited, should keep the save button disabled', async () => {
    mockApi({ [IpcChannels.settings.get]: () => ok(paths) });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);

    await screen.findByLabelText('Biblioteca');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('when a folder is edited and saved, should send the folders and report that a restart is required', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const invoke = mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.update]: (payload) => ok({ value: payload, restartRequired: true }),
    });

    renderWithProviders(<PathsSection onSaved={onSaved} />);

    const field = await screen.findByLabelText('Biblioteca');
    await user.clear(field);
    await user.type(field, 'D:/nova');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true));
    expect(payloadsOf(invoke, IpcChannels.settings.update)).toEqual([
      { ...paths, libraryDir: 'D:/nova' },
    ]);
  });

  it('when the save succeeds, should confirm with a snackbar instead of inline text', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.update]: (payload) => ok({ value: payload, restartRequired: false }),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);

    const field = await screen.findByLabelText('Biblioteca');
    await user.clear(field);
    await user.type(field, 'D:/nova');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    const snackbar = await screen.findByRole('status');
    expect(snackbar).toHaveTextContent('Salvo');
    expect(snackbar).toHaveClass('fixed', 'bottom-4', 'right-4');
  });

  it('when the save is rejected, should show the validation message and no snackbar', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.update]: () =>
        failure('VALIDATION', 'A pasta da biblioteca deve ser um caminho completo (absoluto).'),
    });

    renderWithProviders(<PathsSection onSaved={onSaved} />);

    const field = await screen.findByLabelText('Biblioteca');
    await user.clear(field);
    await user.type(field, 'relativo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('caminho completo');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('when a folder is chosen in the system dialog, should fill the field', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.pickFolder]: () => ok('D:/escolhida'),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);

    await screen.findByLabelText('Entrada');
    await user.click(screen.getByRole('button', { name: 'Escolher pasta: Entrada' }));

    await waitFor(() => expect(screen.getByLabelText('Entrada')).toHaveValue('D:/escolhida'));
    expect(payloadsOf(invoke, IpcChannels.settings.pickFolder)).toEqual([
      { defaultPath: 'D:/inbox' },
    ]);
  });

  it('when the dialog is cancelled, should keep the current value', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.pickFolder]: () => ok(null),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);

    await screen.findByLabelText('Entrada');
    await user.click(screen.getByRole('button', { name: 'Escolher pasta: Entrada' }));

    expect(screen.getByLabelText('Entrada')).toHaveValue('D:/inbox');
  });

  it('when loading fails, should show the error with a retry action', async () => {
    mockApi({
      [IpcChannels.settings.get]: () => failure('INTERNAL', 'Falha ao ler o arquivo'),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);

    expect(await screen.findByText('Não foi possível carregar as configurações')).toBeVisible();
    expect(screen.getByText('Falha ao ler o arquivo')).toBeVisible();
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeVisible();
  });
});
