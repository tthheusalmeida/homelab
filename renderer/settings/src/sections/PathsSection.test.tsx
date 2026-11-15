import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { emitEvent, failure, mockApi, ok, payloadsOf, renderWithProviders } from '../testing';

import { PathsSection } from './PathsSection';

const paths = { libraryDir: 'D:/lib' };

const emptyFolder = (path: string) => ({ path, exists: false, empty: true, fileCount: 0 });
const movedResult = (libraryDir: string) => ({
  libraryDir,
  filesCopied: 3,
  bytesCopied: 30,
  originRemoved: false,
  restartRequired: true,
});

/** Edita o campo da biblioteca e clica em Salvar (que abre o diálogo de como trocar a pasta). */
async function editAndSave(user: ReturnType<typeof userEvent.setup>, value: string) {
  const field = await screen.findByLabelText('Biblioteca');

  await user.clear(field);
  await user.type(field, value);
  await user.click(screen.getByRole('button', { name: 'Salvar' }));
}

describe('PathsSection', () => {
  it('when loaded, should show only the library folder with its current value', async () => {
    mockApi({ [IpcChannels.settings.get]: () => ok(paths) });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);

    expect(await screen.findByLabelText('Biblioteca')).toHaveValue('D:/lib');
    expect(screen.queryByLabelText('Entrada')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Vídeos temporários')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Áudios temporários')).not.toBeInTheDocument();
  });

  it('when nothing was edited, should keep the save button disabled', async () => {
    mockApi({ [IpcChannels.settings.get]: () => ok(paths) });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);

    await screen.findByLabelText('Biblioteca');
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled();
  });

  it('when saving, should inspect the typed folder (trimmed) before anything changes', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: (payload) =>
        ok(emptyFolder((payload as { path: string }).path)),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);
    await editAndSave(user, '  D:/nova  ');

    expect(await screen.findByRole('dialog')).toBeVisible();
    expect(payloadsOf(invoke, IpcChannels.settings.inspectLibrary)).toEqual([{ path: 'D:/nova' }]);
    expect(payloadsOf(invoke, IpcChannels.settings.moveLibrary)).toEqual([]);
  });

  it('when the folder is empty, should offer to move the current library (selected) or to start empty', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: () => ok(emptyFolder('D:/nova')),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);
    await editAndSave(user, 'D:/nova');

    expect(await screen.findByRole('radio', { name: /Mover a biblioteca atual/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Começar com a biblioteca vazia/ })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Mover e usar' })).toBeVisible();
  });

  it('when confirming the move, should send mode move without deleting the origin, report a restart and confirm with a snackbar', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    const invoke = mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: () => ok(emptyFolder('D:/nova')),
      [IpcChannels.settings.moveLibrary]: () => ok(movedResult('D:/nova')),
    });

    renderWithProviders(<PathsSection onSaved={onSaved} />);
    await editAndSave(user, 'D:/nova');
    await user.click(await screen.findByRole('button', { name: 'Mover e usar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true));
    expect(payloadsOf(invoke, IpcChannels.settings.moveLibrary)).toEqual([
      { to: 'D:/nova', mode: 'move', deleteOrigin: false },
    ]);
    expect(await screen.findByRole('status')).toHaveTextContent('Biblioteca trocada');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('when the delete-origin box is checked, should send deleteOrigin true', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: () => ok(emptyFolder('D:/nova')),
      [IpcChannels.settings.moveLibrary]: () => ok(movedResult('D:/nova')),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);
    await editAndSave(user, 'D:/nova');

    const box = await screen.findByRole('checkbox', { name: 'Apagar a pasta antiga depois de mover' });

    expect(box).not.toBeChecked();
    await user.click(box);
    await user.click(screen.getByRole('button', { name: 'Mover e usar' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.settings.moveLibrary)).toEqual([
        { to: 'D:/nova', mode: 'move', deleteOrigin: true },
      ]),
    );
  });

  it('when "start empty" is chosen, should send mode use and hide the delete-origin box', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: () => ok(emptyFolder('D:/nova')),
      [IpcChannels.settings.moveLibrary]: () => ok({ ...movedResult('D:/nova'), filesCopied: 0 }),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);
    await editAndSave(user, 'D:/nova');
    await user.click(await screen.findByRole('radio', { name: /Começar com a biblioteca vazia/ }));

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.settings.moveLibrary)).toEqual([
        { to: 'D:/nova', mode: 'use', deleteOrigin: false },
      ]),
    );
  });

  it('when the folder already has files, should only offer to use it as is and say the current library stays', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: () =>
        ok({ path: 'D:/outra', exists: true, empty: false, fileCount: 12 }),
      [IpcChannels.settings.moveLibrary]: () => ok({ ...movedResult('D:/outra'), filesCopied: 0 }),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);
    await editAndSave(user, 'D:/outra');

    expect(await screen.findByText(/já tem 12 arquivo\(s\)/)).toBeVisible();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.settings.moveLibrary)).toEqual([
        { to: 'D:/outra', mode: 'use', deleteOrigin: false },
      ]),
    );
  });

  it('when the move is running, should show the progress from the events and block the buttons', async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => undefined;
    mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: () => ok(emptyFolder('D:/nova')),
      [IpcChannels.settings.moveLibrary]: () => new Promise((resolve) => (finish = resolve)),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);
    await editAndSave(user, 'D:/nova');
    await user.click(await screen.findByRole('button', { name: 'Mover e usar' }));

    expect(await screen.findByText('Preparando a cópia')).toBeVisible();

    act(() =>
      emitEvent(IpcEvents.libraryMoveProgress, { phase: 'running', processed: 2, total: 4 }),
    );

    expect(await screen.findByText('Copiando 2 de 4 arquivos')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();

    act(() => emitEvent(IpcEvents.libraryMoveProgress, { phase: 'verifying', processed: 4, total: 4 }));
    expect(await screen.findByText('Conferindo a cópia')).toBeVisible();

    await act(async () => finish(ok(movedResult('D:/nova'))));
  });

  it('when the move fails, should keep the dialog open with the error and not report a restart', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: () => ok(emptyFolder('D:/nova')),
      [IpcChannels.settings.moveLibrary]: () =>
        failure('PERSIST_FAILED', 'Não foi possível copiar "a.md": disco cheio'),
    });

    renderWithProviders(<PathsSection onSaved={onSaved} />);
    await editAndSave(user, 'D:/nova');
    await user.click(await screen.findByRole('button', { name: 'Mover e usar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('disco cheio');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('when the old folder could not be deleted, should finish the move and tell why in the snackbar', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: () => ok(emptyFolder('D:/nova')),
      [IpcChannels.settings.moveLibrary]: () =>
        ok({ ...movedResult('D:/nova'), originRemoveError: 'arquivo em uso' }),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);
    await editAndSave(user, 'D:/nova');
    await user.click(await screen.findByRole('button', { name: 'Mover e usar' }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      'A pasta antiga não foi apagada: arquivo em uso',
    );
  });

  it('when the dialog is cancelled, should change nothing', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: () => ok(emptyFolder('D:/nova')),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);
    await editAndSave(user, 'D:/nova');
    await user.click(await screen.findByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(payloadsOf(invoke, IpcChannels.settings.moveLibrary)).toEqual([]);
    expect(screen.getByLabelText('Biblioteca')).toHaveValue('D:/nova');
  });

  it('when inspecting is rejected (relative path), should show the message inline and open no dialog', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.inspectLibrary]: () =>
        failure('VALIDATION', 'A pasta da biblioteca deve ser um caminho completo (absoluto).'),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);
    await editAndSave(user, 'relativo');

    expect(await screen.findByRole('alert')).toHaveTextContent('caminho completo');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('when a folder is chosen in the system dialog, should fill the field', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.pickFolder]: () => ok('D:/escolhida'),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);

    await screen.findByLabelText('Biblioteca');
    await user.click(screen.getByRole('button', { name: 'Escolher pasta: Biblioteca' }));

    await waitFor(() => expect(screen.getByLabelText('Biblioteca')).toHaveValue('D:/escolhida'));
    expect(payloadsOf(invoke, IpcChannels.settings.pickFolder)).toEqual([
      { defaultPath: 'D:/lib' },
    ]);
  });

  it('when the dialog is cancelled in the system picker, should keep the current value', async () => {
    const user = userEvent.setup();
    mockApi({
      [IpcChannels.settings.get]: () => ok(paths),
      [IpcChannels.settings.pickFolder]: () => ok(null),
    });

    renderWithProviders(<PathsSection onSaved={vi.fn()} />);

    await screen.findByLabelText('Biblioteca');
    await user.click(screen.getByRole('button', { name: 'Escolher pasta: Biblioteca' }));

    expect(screen.getByLabelText('Biblioteca')).toHaveValue('D:/lib');
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
