import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { emitEvent, mockApi, ok, payloadsOf } from '#test/api-mock';
import { setupStatus } from '#test/components-fixtures';
import { renderWithQuery } from '#test/utils';

import { SidebarSetupProgress } from './SidebarSetupProgress';

const handlers = (status = setupStatus()) => ({
  [IpcChannels.components.status]: () => ok(status),
  [IpcChannels.app.openSettings]: () => ok(undefined),
});

describe('SidebarSetupProgress', () => {
  it('when there is nothing to install, should render nothing', async () => {
    const invoke = mockApi(handlers(setupStatus({ needsSetup: false })));

    renderWithQuery(<SidebarSetupProgress />);

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('when setup is pending and nothing is running, should remind to conclude the installation', async () => {
    mockApi(handlers());

    renderWithQuery(<SidebarSetupProgress />);

    expect(await screen.findByText('Concluir a instalação')).toBeInTheDocument();
    expect(screen.getByText('Falta baixar um modelo para transcrever.')).toBeInTheDocument();
  });

  it('when a download is running, should show n of N and the percentage', async () => {
    mockApi(handlers());

    renderWithQuery(<SidebarSetupProgress />);
    await screen.findByText('Concluir a instalação');

    act(() =>
      emitEvent(
        IpcEvents.componentsProgress,
        setupStatus({
          running: true,
          overall: { total: 3, done: 1, receivedBytes: 450, totalBytes: 1000 },
        }),
      ),
    );

    expect(await screen.findByText('Instalando 1 de 3')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso da instalação' })).toHaveAttribute(
      'aria-valuenow',
      '45',
    );
    expect(screen.getByText(/45%/)).toBeInTheDocument();
  });

  it('when clicked, should open the Settings in the Components section', async () => {
    const invoke = mockApi(handlers());

    renderWithQuery(<SidebarSetupProgress />);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver detalhes da instalação' }),
    );

    expect(payloadsOf(invoke, IpcChannels.app.openSettings)).toEqual([{ section: 'components' }]);
  });
});
