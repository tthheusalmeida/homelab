import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { availableUpdate, updateStatus } from '#test/updates-fixtures';

import { emitEvent, failure, mockApi, ok, payloadsOf, renderWithProviders } from '../testing';
import { UpdatesSection } from './UpdatesSection';

const withStatus = (status = updateStatus(), extra: Record<string, () => unknown> = {}) =>
  mockApi({
    [IpcChannels.updates.status]: () => ok(status),
    ...extra,
  });

const AUTO_CHECK = 'Verificar atualizações automaticamente';

describe('UpdatesSection', () => {
  it('when opened, should show the installed version', async () => {
    withStatus();

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByText('0.2.0')).toBeVisible();
    expect(screen.getByText('Ainda não verificou nesta sessão')).toBeVisible();
  });

  it('when the status cannot be read, should show the error with a retry', async () => {
    mockApi({ [IpcChannels.updates.status]: () => failure('INTERNAL', 'falhou') });

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByText('Não foi possível carregar as configurações')).toBeVisible();
  });

  it('when the app is up to date, should say so and offer only to check again', async () => {
    withStatus(updateStatus({ checkedAt: Date.UTC(2026, 10, 17, 12, 0) }));

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByText('Você está na versão mais recente.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Verificar agora' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Baixar atualização' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reiniciar e atualizar' })).not.toBeInTheDocument();
  });

  it('when a new version is available, should show it with its release notes', async () => {
    withStatus(availableUpdate());

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByText('A versão 0.3.0 está disponível.')).toBeVisible();
    expect(screen.getByText('Novidades da versão 0.3.0')).toBeVisible();
    expect(screen.getByText('Leitura mais rápida')).toBeVisible();
  });

  it('when the release has no notes, should say so', async () => {
    const status = availableUpdate();

    withStatus({ ...status, latest: { ...status.latest!, notes: '  ' } });

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByText('Esta versão não traz notas.')).toBeVisible();
  });

  it('when Verificar agora is clicked, should ask the main to check and show the result', async () => {
    const user = userEvent.setup();
    const invoke = withStatus(updateStatus(), {
      [IpcChannels.updates.check]: () => ok(availableUpdate()),
    });

    renderWithProviders(<UpdatesSection />);
    await user.click(await screen.findByRole('button', { name: 'Verificar agora' }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.updates.check)).toHaveLength(1));
    expect(await screen.findByText('A versão 0.3.0 está disponível.')).toBeVisible();
  });

  it('when the check fails, should show the message from the main', async () => {
    withStatus(updateStatus({ error: 'Não foi possível verificar as atualizações.' }));

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível verificar as atualizações.',
    );
  });

  it('when the version is ready, should say it was downloaded and offer to restart', async () => {
    withStatus(availableUpdate({ state: 'ready', progress: 100 }));

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByText(/A versão 0.3.0 já foi baixada/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reiniciar e atualizar' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Baixar atualização' })).not.toBeInTheDocument();
  });

  it('when restarting, should ask for confirmation before anything happens', async () => {
    const user = userEvent.setup();
    const invoke = withStatus(availableUpdate({ state: 'ready' }), {
      [IpcChannels.updates.install]: () => ok(availableUpdate({ state: 'installing' })),
    });

    renderWithProviders(<UpdatesSection />);
    await user.click(await screen.findByRole('button', { name: 'Reiniciar e atualizar' }));

    expect(await screen.findByText('Reiniciar o HomeLab?')).toBeVisible();
    expect(payloadsOf(invoke, IpcChannels.updates.install)).toHaveLength(0);
  });

  it('when the restart is confirmed, should ask the main to restart and install', async () => {
    const user = userEvent.setup();
    const invoke = withStatus(availableUpdate({ state: 'ready' }), {
      [IpcChannels.updates.install]: () => ok(availableUpdate({ state: 'installing' })),
    });

    renderWithProviders(<UpdatesSection />);
    await user.click(await screen.findByRole('button', { name: 'Reiniciar e atualizar' }));
    await user.click(await screen.findByRole('button', { name: 'Reiniciar agora' }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.updates.install)).toHaveLength(1));
  });

  it('when the confirmation is dismissed, should not restart', async () => {
    const user = userEvent.setup();
    const invoke = withStatus(availableUpdate({ state: 'ready' }));

    renderWithProviders(<UpdatesSection />);
    await user.click(await screen.findByRole('button', { name: 'Reiniciar e atualizar' }));
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByText('Reiniciar o HomeLab?')).not.toBeInTheDocument());
    expect(payloadsOf(invoke, IpcChannels.updates.install)).toHaveLength(0);
  });

  it('when the download is running, should show the progress and block the buttons', async () => {
    withStatus(availableUpdate({ state: 'downloading', progress: 57 }));

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByText('Baixando a atualização… 57%')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Progresso do download' })).toHaveAttribute(
      'aria-valuenow',
      '57',
    );
    expect(screen.getByRole('button', { name: 'Verificar agora' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Reiniciar e atualizar' })).not.toBeInTheDocument();
  });

  it('when the main reports progress, should update the bar without reloading', async () => {
    withStatus(availableUpdate({ state: 'downloading', progress: 10 }));

    renderWithProviders(<UpdatesSection />);
    await screen.findByText('Baixando a atualização… 10%');

    act(() =>
      emitEvent(IpcEvents.updatesChanged, availableUpdate({ state: 'downloading', progress: 80 })),
    );

    expect(await screen.findByText('Baixando a atualização… 80%')).toBeVisible();
  });

  it('when the download finishes while the screen is open, should switch to the restart button', async () => {
    withStatus(availableUpdate({ state: 'downloading', progress: 90 }));

    renderWithProviders(<UpdatesSection />);
    await screen.findByText('Baixando a atualização… 90%');

    act(() => emitEvent(IpcEvents.updatesChanged, availableUpdate({ state: 'ready' })));

    expect(await screen.findByRole('button', { name: 'Reiniciar e atualizar' })).toBeEnabled();
  });

  it('when the installer is starting, should warn that the app will close and reopen', async () => {
    withStatus(availableUpdate({ state: 'installing', progress: 100 }));

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByText(/vai fechar e abrir de novo sozinho/)).toBeVisible();
  });

  it('when the automatic download failed, should show the error and let the user try again without a confirmation', async () => {
    const user = userEvent.setup();
    const invoke = withStatus(
      availableUpdate({ error: 'Não foi possível baixar a atualização. Tente de novo.' }),
      { [IpcChannels.updates.install]: () => ok(availableUpdate({ state: 'ready' })) },
    );

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível baixar');

    await user.click(screen.getByRole('button', { name: 'Baixar atualização' }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.updates.install)).toHaveLength(1));
    expect(screen.queryByText('Reiniciar o HomeLab?')).not.toBeInTheDocument();
  });

  it('when the app cannot update by itself, should offer the release page without a confirmation', async () => {
    const user = userEvent.setup();
    const invoke = withStatus(availableUpdate({ canInstall: false }), {
      [IpcChannels.updates.install]: () => ok(availableUpdate({ canInstall: false })),
    });

    renderWithProviders(<UpdatesSection />);
    await user.click(await screen.findByRole('button', { name: 'Ver a versão no navegador' }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.updates.install)).toHaveLength(1));
    expect(screen.queryByText('Reiniciar o HomeLab?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Baixar atualização' })).not.toBeInTheDocument();
    expect(screen.getByText(/instalada por você/)).toBeVisible();
  });

  it('when the automatic check is on, should show the option checked', async () => {
    withStatus(updateStatus({ autoCheck: true }));

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByRole('checkbox', { name: AUTO_CHECK })).toBeChecked();
  });

  it('when the user turns the automatic check off, should save it through the main and show it off', async () => {
    const user = userEvent.setup();
    const invoke = withStatus(updateStatus({ autoCheck: true }), {
      [IpcChannels.updates.setAutoCheck]: () => ok(updateStatus({ autoCheck: false })),
    });

    renderWithProviders(<UpdatesSection />);
    await user.click(await screen.findByRole('checkbox', { name: AUTO_CHECK }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.updates.setAutoCheck)).toEqual([{ autoCheck: false }]),
    );
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: AUTO_CHECK })).not.toBeChecked(),
    );
  });

  it('when the automatic check is off, should still let the user check by hand', async () => {
    withStatus(updateStatus({ autoCheck: false }));

    renderWithProviders(<UpdatesSection />);

    expect(await screen.findByRole('checkbox', { name: AUTO_CHECK })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Verificar agora' })).toBeEnabled();
  });

  it('when saving the automatic check fails, should show a generic message', async () => {
    const user = userEvent.setup();

    withStatus(updateStatus(), {
      [IpcChannels.updates.setAutoCheck]: () => failure('INTERNAL', 'x'),
    });

    renderWithProviders(<UpdatesSection />);
    await user.click(await screen.findByRole('checkbox', { name: AUTO_CHECK }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir');
  });

  it('when an action fails in the channel, should show a generic message', async () => {
    const user = userEvent.setup();

    withStatus(updateStatus(), {
      [IpcChannels.updates.check]: () => failure('INTERNAL', 'x'),
    });

    renderWithProviders(<UpdatesSection />);
    await user.click(await screen.findByRole('button', { name: 'Verificar agora' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível concluir');
  });
});
