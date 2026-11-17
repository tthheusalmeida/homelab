import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { createTestQueryClient } from '#test/utils';
import { emitEvent, mockApi, ok, payloadsOf } from '#test/api-mock';

import { SidebarRestartNotice } from './SidebarRestartNotice';

const renderNotice = () =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <SidebarRestartNotice />
    </QueryClientProvider>,
  );

describe('SidebarRestartNotice', () => {
  it('when nothing is pending, should render nothing', async () => {
    const invoke = mockApi({ [IpcChannels.app.restartPending]: () => ok(false) });

    renderNotice();

    await waitFor(() => expect(invoke).toHaveBeenCalledWith(IpcChannels.app.restartPending));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('when a restart is pending, should warn and offer the restart button', async () => {
    mockApi({ [IpcChannels.app.restartPending]: () => ok(true) });

    renderNotice();

    expect(await screen.findByRole('alert')).toHaveTextContent('Reinício pendente');
    expect(screen.getByText('As alterações só valem depois de reiniciar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reiniciar agora/ })).toBeInTheDocument();
  });

  it('when the restart button is clicked, should ask the main to relaunch', async () => {
    const user = userEvent.setup();
    const invoke = mockApi({
      [IpcChannels.app.restartPending]: () => ok(true),
      [IpcChannels.app.relaunch]: () => ok(undefined),
    });
    renderNotice();

    await user.click(await screen.findByRole('button', { name: /Reiniciar agora/ }));

    expect(payloadsOf(invoke, IpcChannels.app.relaunch)).toHaveLength(1);
  });

  it('when the settings window marks it later (even if closed afterwards), should show it in the sidebar', async () => {
    mockApi({ [IpcChannels.app.restartPending]: () => ok(false) });
    renderNotice();
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());

    act(() => emitEvent(IpcEvents.restartPending, true));

    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });
});
