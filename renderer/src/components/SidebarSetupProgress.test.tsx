import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { emitEvent, mockApi, ok, payloadsOf } from '#test/api-mock';
import { component, setupStatus } from '#test/components-fixtures';
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

describe('SidebarSetupProgress (cause of the pending setup)', () => {
  it('when a model is installed but an essential component is missing, should name that component instead of blaming the model', async () => {
    const base = setupStatus();
    mockApi(
      handlers({
        ...base,
        components: [
          ...base.components.map((item) =>
            item.id === 'whisper-runtime' ? { ...item, state: 'missing' as const } : item,
          ),
          component({ id: 'model-extra', label: 'Modelo extra', state: 'installed' }),
        ],
      }),
    );

    renderWithQuery(<SidebarSetupProgress />);

    expect(await screen.findByText(/Falta um componente essencial: Transcrição\./)).toBeInTheDocument();
    expect(screen.queryByText('Falta baixar um modelo para transcrever.')).not.toBeInTheDocument();
  });

  it('when several essential components are missing, should list all of them', async () => {
    const base = setupStatus();
    mockApi(
      handlers({
        ...base,
        components: [
          ...base.components.map((item) =>
            item.id === 'whisper-runtime' ? { ...item, state: 'missing' as const } : item,
          ),
          component({ id: 'ffmpeg', group: 'runtime', label: 'Processamento de áudio', required: true }),
        ],
      }),
    );

    renderWithQuery(<SidebarSetupProgress />);

    expect(
      await screen.findByText(/Transcrição, Processamento de áudio/),
    ).toBeInTheDocument();
  });

  it('when only the model is missing, should keep asking to download a model', async () => {
    mockApi(handlers());

    renderWithQuery(<SidebarSetupProgress />);

    expect(
      await screen.findByText('Falta baixar um modelo para transcrever.'),
    ).toBeInTheDocument();
  });
});
