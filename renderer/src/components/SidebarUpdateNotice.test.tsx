import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { emitEvent, mockApi, ok } from '#test/api-mock';
import { availableUpdate, updateStatus } from '#test/updates-fixtures';
import { createTestQueryClient } from '#test/utils';

import { SidebarUpdateNotice } from './SidebarUpdateNotice';

function Where() {
  const { pathname, search } = useLocation();

  return <p data-testid="where">{`${pathname}${search}`}</p>;
}

const renderNotice = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter>
        <SidebarUpdateNotice />
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('SidebarUpdateNotice', () => {
  it('when the app is up to date, should render nothing', async () => {
    const invoke = mockApi({ [IpcChannels.updates.status]: () => ok(updateStatus()) });

    renderNotice();

    await waitFor(() => expect(invoke).toHaveBeenCalledWith(IpcChannels.updates.status));
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('when a new version is available, should announce it with the version number', async () => {
    mockApi({ [IpcChannels.updates.status]: () => ok(availableUpdate()) });

    renderNotice();

    expect(
      await screen.findByRole('button', { name: 'Abrir atualização do app' }),
    ).toHaveTextContent('Atualização 0.3.0 disponível');
  });

  it('when clicked, should go to the updates section of the settings', async () => {
    const user = userEvent.setup();
    mockApi({ [IpcChannels.updates.status]: () => ok(availableUpdate()) });

    renderNotice();
    await user.click(await screen.findByRole('button', { name: 'Abrir atualização do app' }));

    expect(screen.getByTestId('where')).toHaveTextContent('/settings?section=updates');
  });

  it('when the download is running, should show the progress', async () => {
    mockApi({
      [IpcChannels.updates.status]: () =>
        ok(availableUpdate({ state: 'downloading', progress: 42 })),
    });

    renderNotice();

    expect(await screen.findByText('Baixando a atualização · 42%')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Progresso do download' })).toHaveAttribute(
      'aria-valuenow',
      '42',
    );
  });

  it('when the installer is starting, should say the update is being installed', async () => {
    mockApi({
      [IpcChannels.updates.status]: () => ok(availableUpdate({ state: 'installing' })),
    });

    renderNotice();

    expect(await screen.findByText('Instalando a atualização')).toBeVisible();
  });

  it('when the version is ready, should announce it and offer to restart', async () => {
    mockApi({ [IpcChannels.updates.status]: () => ok(availableUpdate({ state: 'ready' })) });

    renderNotice();

    expect(await screen.findByText('Atualização 0.3.0 pronta')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reiniciar e atualizar' })).toBeEnabled();
  });

  it('when Reiniciar e atualizar is clicked, should ask the main to install without leaving the page', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.updates.status]: () => ok(availableUpdate({ state: 'ready' })),
      [IpcChannels.updates.install]: () => ok(availableUpdate({ state: 'installing' })),
    });

    renderNotice();
    await user.click(await screen.findByRole('button', { name: 'Reiniciar e atualizar' }));

    await waitFor(() => expect(invoke).toHaveBeenCalledWith(IpcChannels.updates.install));
    expect(screen.getByTestId('where')).toHaveTextContent('/');
    expect(screen.getByTestId('where')).not.toHaveTextContent('settings');
  });

  it('when the version is not ready yet, should not offer to restart', async () => {
    mockApi({ [IpcChannels.updates.status]: () => ok(availableUpdate({ state: 'downloading' })) });

    renderNotice();
    await screen.findByText(/Baixando a atualização/);

    expect(screen.queryByRole('button', { name: 'Reiniciar e atualizar' })).not.toBeInTheDocument();
  });

  it('when the main reports a new version later, should show the notice without reloading', async () => {
    mockApi({ [IpcChannels.updates.status]: () => ok(updateStatus()) });

    renderNotice();
    await waitFor(() => expect(screen.queryByRole('button')).not.toBeInTheDocument());

    act(() => emitEvent(IpcEvents.updatesChanged, availableUpdate()));

    expect(await screen.findByText('Atualização 0.3.0 disponível')).toBeVisible();
  });
});
