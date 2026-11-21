import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { emitEvent, failure, mockApi, ok, payloadsOf, renderWithProviders } from '../testing';

import { BackupSection } from './BackupSection';

const preview = {
  items: [
    { id: 'library', kind: 'files', count: 12, bytes: 3 * 1024 * 1024, estimatedZipBytes: 1024 * 1024 },
    { id: 'inbox', kind: 'files', count: 0, bytes: 0, estimatedZipBytes: 0 },
    { id: 'jobs', kind: 'records', count: 4, bytes: 2048, estimatedZipBytes: 512 },
    { id: 'chats', kind: 'records', count: 1, bytes: 10 * 1024, estimatedZipBytes: 2048 },
    { id: 'usage', kind: 'records', count: 30, bytes: 4096, estimatedZipBytes: 1024 },
    { id: 'settings', kind: 'records', count: 1, bytes: 200, estimatedZipBytes: 40 },
  ],
  notIncluded: ['secrets', 'temp', 'ai-binaries', 'preferences', 'library-path'],
};

const inspection = {
  token: 'tok-1',
  fileName: 'homelab-backup-2026-11-15.zip',
  createdAt: '2026-11-15T16:45:30.000Z',
  appVersion: '1.0.0',
  items: [
    { id: 'library', kind: 'files', count: 5, bytes: 4096 },
    { id: 'chats', kind: 'records', count: 2, bytes: 1024 },
  ],
};

const restored = {
  items: [
    { id: 'chats', added: 1, skipped: 1 },
    { id: 'library', added: 4, skipped: 0 },
  ],
  safetyCopyPath: null,
  restartRequired: false,
};

const createCard = () => screen.getByRole('region', { name: 'Criar backup' });
const restoreCard = () => screen.getByRole('region', { name: 'Restaurar backup' });
const itemBox = (name: RegExp) => within(createCard()).getByRole('checkbox', { name });
const restoreBox = (name: RegExp) => within(restoreCard()).getByRole('checkbox', { name });

describe('BackupSection: criar backup', () => {
  const render = (handlers: Record<string, (payload: unknown) => unknown> = {}) => {
    const invoke = mockApi({
      [IpcChannels.backup.preview]: () => ok(preview),
      ...handlers,
    });

    renderWithProviders(<BackupSection onSaved={vi.fn()} />);

    return invoke;
  };

  it('when opened, should list every item with its count and size, all selected', async () => {
    render();

    await screen.findByTestId('backup-total');
    for (const label of ['Biblioteca', 'Classificação', 'Jobs', 'Chats', 'Consumo de IA']) {
      expect(itemBox(new RegExp(label))).toBeChecked();
    }
    expect(screen.getByText(/12 arquivos · 3,0 MB/)).toBeVisible();
    expect(screen.getByText(/4 registros · 2,0 KB/)).toBeVisible();
    expect(screen.getByText(/1 registro · 10 KB/)).toBeVisible();
    expect(screen.getByText('vazio')).toBeVisible();
  });

  it('when everything is selected, should show the original size and the zip estimate, flagged as an estimate', async () => {
    render();

    const total = await screen.findByTestId('backup-total');

    expect(total).toHaveTextContent('Tamanho original 3,0 MB');
    expect(total).toHaveTextContent('zip estimado em 1,0 MB');
    expect(total).toHaveTextContent('estimativa');
  });

  it('when an item is unchecked, should drop it from the totals', async () => {
    const user = userEvent.setup();

    render();
    await screen.findByTestId('backup-total');
    await user.click(itemBox(/Biblioteca/));

    expect(screen.getByTestId('backup-total')).toHaveTextContent('Tamanho original 16 KB');
  });

  it('when nothing is selected, should say so and disable the create button', async () => {
    const user = userEvent.setup();

    render();
    await screen.findByTestId('backup-total');

    for (const label of ['Biblioteca', 'Classificação', 'Jobs', 'Chats', 'Consumo de IA', 'Aparência']) {
      await user.click(itemBox(new RegExp(label)));
    }

    expect(screen.getByTestId('backup-total')).toHaveTextContent('Marque pelo menos um item.');
    expect(screen.getByRole('button', { name: /Criar backup…/ })).toBeDisabled();
  });

  it('when opened, should warn about everything that is left out of the backup', async () => {
    render();

    const note = await screen.findByRole('note');

    expect(within(note).getByText(/O que NÃO entra no backup/)).toBeVisible();
    expect(within(note).getByText(/Chaves de API/)).toBeVisible();
    expect(within(note).getByText(/temporários/)).toBeVisible();
    expect(within(note).getByText(/programas de transcrição/)).toBeVisible();
    expect(within(note).getByText(/Preferências de tela/)).toBeVisible();
    expect(within(note).getByText(/caminho da pasta da biblioteca/)).toBeVisible();
  });

  it('when creating, should send only the checked items and confirm with the real size and the path', async () => {
    const user = userEvent.setup();
    const invoke = render({
      [IpcChannels.backup.create]: () =>
        ok({ cancelled: false, path: 'D:/backups/b.zip', bytes: 2 * 1024 * 1024, files: 20 }),
    });

    await screen.findByTestId('backup-total');
    await user.click(itemBox(/Classificação/));
    await user.click(itemBox(/Consumo de IA/));
    await user.click(screen.getByRole('button', { name: /Criar backup…/ }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.backup.create)).toEqual([
        { items: ['library', 'jobs', 'chats', 'settings'] },
      ]),
    );
    expect(await screen.findByText('Salvo em D:/backups/b.zip')).toBeVisible();
    expect(await screen.findByRole('status')).toHaveTextContent('Backup criado (2,0 MB)');
  });

  it('when the backup is created, should offer a "Ver" button that reveals the zip in its folder', async () => {
    const user = userEvent.setup();
    const invoke = render({
      [IpcChannels.backup.create]: () =>
        ok({ cancelled: false, path: 'D:/backups/b.zip', bytes: 1024, files: 3 }),
      [IpcChannels.app.revealFile]: () => ok(true),
    });

    await screen.findByTestId('backup-total');
    await user.click(screen.getByRole('button', { name: /Criar backup…/ }));
    await user.click(await screen.findByRole('button', { name: 'Ver' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.app.revealFile)).toEqual([{ path: 'D:/backups/b.zip' }]),
    );
  });

  it('when the backup is running, should show the progress from the events, block changes and offer to cancel', async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => undefined;
    const invoke = render({
      [IpcChannels.backup.create]: () => new Promise((resolve) => (finish = resolve)),
      [IpcChannels.backup.cancel]: () => ok(undefined),
    });

    await screen.findByTestId('backup-total');
    await user.click(screen.getByRole('button', { name: /Criar backup…/ }));

    expect(await screen.findByText('Preparando')).toBeVisible();

    act(() =>
      emitEvent(IpcEvents.backupProgress, { phase: 'running', processed: 3, total: 12 }),
    );

    expect(await screen.findByText('Processando 3 de 12 arquivos')).toBeVisible();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
    expect(itemBox(/Biblioteca/)).toBeDisabled();
    expect(screen.getByRole('button', { name: /Criar backup…/ })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(payloadsOf(invoke, IpcChannels.backup.cancel)).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Cancelando…' })).toBeDisabled();

    await act(async () => finish(ok({ cancelled: true })));
  });

  it('when the backup is cancelled, should say that no file was created', async () => {
    const user = userEvent.setup();

    render({ [IpcChannels.backup.create]: () => ok({ cancelled: true }) });
    await screen.findByTestId('backup-total');
    await user.click(screen.getByRole('button', { name: /Criar backup…/ }));

    expect(await screen.findByText(/Nenhum arquivo foi criado/)).toBeVisible();
  });

  it('when creating fails, should show the error and let the user try again', async () => {
    const user = userEvent.setup();

    render({
      [IpcChannels.backup.create]: () =>
        failure('PERSIST_FAILED', 'Não foi possível criar o backup: disco cheio'),
    });
    await screen.findByTestId('backup-total');
    await user.click(screen.getByRole('button', { name: /Criar backup…/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('disco cheio');
    expect(screen.getByRole('button', { name: /Criar backup…/ })).toBeEnabled();
  });

  it('when the sizes cannot be loaded, should show the error with a retry', async () => {
    render({ [IpcChannels.backup.preview]: () => failure('INTERNAL', 'sem leitura') });

    expect(await screen.findByText('Não foi possível calcular o tamanho do backup.')).toBeVisible();
    expect(screen.getByText('sem leitura')).toBeVisible();
    expect(screen.getByRole('button', { name: /Tentar novamente/ })).toBeVisible();
  });
});

describe('BackupSection: restaurar backup', () => {
  const render = (handlers: Record<string, (payload: unknown) => unknown> = {}, onSaved = vi.fn()) => {
    const invoke = mockApi({
      [IpcChannels.backup.preview]: () => ok(preview),
      [IpcChannels.backup.inspect]: () => ok(inspection),
      [IpcChannels.backup.restore]: () => ok(restored),
      ...handlers,
    });

    renderWithProviders(<BackupSection onSaved={onSaved} />);

    return { invoke, onSaved };
  };

  const chooseBackup = async (user: ReturnType<typeof userEvent.setup>) => {
    await screen.findByTestId('backup-total');
    await user.click(screen.getByRole('button', { name: 'Escolher backup…' }));
    await screen.findByText(inspection.fileName);
  };

  it('when a backup is chosen, should show its file, date, version and items with everything selected and "merge" as the mode', async () => {
    const user = userEvent.setup();

    render();
    await chooseBackup(user);

    expect(screen.getByText(/Criado em .* · HomeLab 1\.0\.0/)).toBeVisible();
    expect(restoreBox(/Biblioteca.*Páginas e livros/)).toBeChecked();
    expect(restoreBox(/Chats.*Todas as conversas/)).toBeChecked();
    expect(within(restoreCard()).getByText('5 arquivos · 4,0 KB')).toBeVisible();
    expect(within(restoreCard()).getByText('2 registros · 1,0 KB')).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Mesclar' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Substituir' })).not.toBeChecked();
    expect(screen.getByText(/Não apaga nem sobrescreve nada/)).toBeVisible();
  });

  it('when the user cancels the file dialog, should keep the screen as it was', async () => {
    const user = userEvent.setup();

    render({ [IpcChannels.backup.inspect]: () => ok(null) });
    await screen.findByTestId('backup-total');
    await user.click(screen.getByRole('button', { name: 'Escolher backup…' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Escolher backup…' })).toBeEnabled());
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('when the file is not a valid backup, should show the error', async () => {
    const user = userEvent.setup();

    render({
      [IpcChannels.backup.inspect]: () =>
        failure('VALIDATION', 'Este arquivo não é um backup do HomeLab válido.'),
    });
    await screen.findByTestId('backup-total');
    await user.click(screen.getByRole('button', { name: 'Escolher backup…' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('não é um backup do HomeLab válido');
  });

  it('when restoring in merge mode, should restore right away with the chosen items, summarize and report no restart', async () => {
    const user = userEvent.setup();
    const { invoke, onSaved } = render();

    await chooseBackup(user);
    await user.click(restoreBox(/Chats/));
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.backup.restore)).toEqual([
        { token: 'tok-1', items: ['library'], mode: 'merge' },
      ]),
    );
    expect(await screen.findByText('Biblioteca: 4 adicionado(s)')).toBeVisible();
    expect(screen.getByText('Chats: 1 adicionado(s), 1 mantido(s) como estavam')).toBeVisible();
    expect(screen.getByText(/chave do Gemini não vem no backup/)).toBeVisible();
    expect(onSaved).toHaveBeenCalledWith(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('when replacing, should ask for confirmation first and restore only after confirming', async () => {
    const user = userEvent.setup();
    const { invoke } = render({
      [IpcChannels.backup.restore]: () => ok({ ...restored, safetyCopyPath: 'D:/Docs/HomeLab/temp/safety-1' }),
    });

    await chooseBackup(user);
    await user.click(screen.getByRole('radio', { name: 'Substituir' }));
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));

    const dialog = await screen.findByRole('dialog');

    expect(dialog).toHaveTextContent('Substituir os dados atuais?');
    expect(payloadsOf(invoke, IpcChannels.backup.restore)).toEqual([]);

    await user.click(within(dialog).getByRole('button', { name: 'Substituir' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.backup.restore)).toEqual([
        { token: 'tok-1', items: ['library', 'chats'], mode: 'replace' },
      ]),
    );
    expect(await screen.findByText(/Cópia do que havia antes: D:\/Docs\/HomeLab\/temp\/safety-1/)).toBeVisible();
  });

  it('when the replace confirmation is cancelled, should restore nothing', async () => {
    const user = userEvent.setup();
    const { invoke } = render();

    await chooseBackup(user);
    await user.click(screen.getByRole('radio', { name: 'Substituir' }));
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(payloadsOf(invoke, IpcChannels.backup.restore)).toEqual([]);
  });

  it('when nothing is selected, should disable restoring', async () => {
    const user = userEvent.setup();

    render();
    await chooseBackup(user);
    await user.click(restoreBox(/Biblioteca/));
    await user.click(restoreBox(/Chats/));

    expect(screen.getByRole('button', { name: 'Restaurar' })).toBeDisabled();
  });

  it('when a restore needs a restart (Ollama address changed), should report it so the banner shows', async () => {
    const user = userEvent.setup();
    const { onSaved } = render({
      [IpcChannels.backup.restore]: () => ok({ ...restored, restartRequired: true }),
    });

    await chooseBackup(user);
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(true));
  });

  it('when restoring is running, should show the progress and block the items', async () => {
    const user = userEvent.setup();
    let finish: (value: unknown) => void = () => undefined;

    render({ [IpcChannels.backup.restore]: () => new Promise((resolve) => (finish = resolve)) });
    await chooseBackup(user);
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));

    expect(await screen.findByText('Restaurando')).toBeVisible();

    act(() => emitEvent(IpcEvents.backupProgress, { phase: 'verifying', processed: 5, total: 5 }));

    expect(await screen.findByText('Conferindo e aplicando')).toBeVisible();
    expect(restoreBox(/Biblioteca/)).toBeDisabled();

    await act(async () => finish(ok(restored)));
  });

  it('when restoring fails, should show the error (with the undo notice) and keep the selection to try again', async () => {
    const user = userEvent.setup();

    render({
      [IpcChannels.backup.restore]: () =>
        failure('PERSIST_FAILED', 'Não foi possível restaurar o backup: disco cheio As alterações feitas até aqui foram desfeitas.'),
    });
    await chooseBackup(user);
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('foram desfeitas');
    expect(restoreBox(/Biblioteca/)).toBeChecked();
    expect(screen.getByRole('button', { name: 'Restaurar' })).toBeEnabled();
  });

  it('when a backup was restored, should let the user pick another one', async () => {
    const user = userEvent.setup();

    render();
    await chooseBackup(user);
    await user.click(screen.getByRole('button', { name: 'Restaurar' }));
    await screen.findByText('Biblioteca: 4 adicionado(s)');

    expect(screen.getByRole('button', { name: 'Escolher outro backup' })).toBeEnabled();
  });
});

describe('BackupSection: mapas mentais e infográficos', () => {
  const withGenerated = {
    items: [
      { id: 'library', kind: 'files', count: 2, bytes: 2048, estimatedZipBytes: 512 },
      { id: 'mindMaps', kind: 'records', count: 3, bytes: 3000, estimatedZipBytes: 600 },
      { id: 'infographics', kind: 'records', count: 1, bytes: 2000, estimatedZipBytes: 400 },
    ],
    notIncluded: [],
  };

  const render = (handlers: Record<string, (payload: unknown) => unknown> = {}) => {
    const invoke = mockApi({
      [IpcChannels.backup.preview]: () => ok(withGenerated),
      ...handlers,
    });

    renderWithProviders(<BackupSection onSaved={vi.fn()} />);

    return invoke;
  };

  it('when opened, should list the mind maps and the infographics as separate items, both selected', async () => {
    render();

    await screen.findByTestId('backup-total');

    expect(itemBox(/Mapas mentais/)).toBeChecked();
    expect(itemBox(/Infográficos/)).toBeChecked();
    expect(screen.getByText(/3 registros/)).toBeVisible();
    expect(screen.getByText(/1 registro/)).toBeVisible();
  });

  it('when only the mind maps are unchecked, should send the infographics (and not the mind maps)', async () => {
    const user = userEvent.setup();
    const invoke = render({
      [IpcChannels.backup.create]: () =>
        ok({ cancelled: false, path: 'D:/backups/b.zip', bytes: 1024, files: 3 }),
    });

    await screen.findByTestId('backup-total');
    await user.click(itemBox(/Mapas mentais/));
    await user.click(screen.getByRole('button', { name: /Criar backup…/ }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.backup.create)).toEqual([
        { items: ['library', 'infographics'] },
      ]),
    );
  });

  it('when only the infographics are unchecked, should send the mind maps (and not the infographics)', async () => {
    const user = userEvent.setup();
    const invoke = render({
      [IpcChannels.backup.create]: () =>
        ok({ cancelled: false, path: 'D:/backups/b.zip', bytes: 1024, files: 3 }),
    });

    await screen.findByTestId('backup-total');
    await user.click(itemBox(/Infográficos/));
    await user.click(screen.getByRole('button', { name: /Criar backup…/ }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.backup.create)).toEqual([
        { items: ['library', 'mindMaps'] },
      ]),
    );
  });
});
