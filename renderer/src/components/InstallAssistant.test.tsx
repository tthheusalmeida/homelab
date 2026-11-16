import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { emitEvent, failure, mockApi, ok, payloadsOf } from '#test/api-mock';
import { component, setupStatus } from '#test/components-fixtures';
import { renderWithQuery } from '#test/utils';

import { InstallAssistant } from './InstallAssistant';

const withStatus = (status = setupStatus()) => ({
  [IpcChannels.components.status]: () => ok(status),
  [IpcChannels.components.install]: () => ok({ ...status, running: true }),
  [IpcChannels.components.cancel]: () => ok(undefined),
  [IpcChannels.app.openSettings]: () => ok(undefined),
});

describe('InstallAssistant', () => {
  it('when setup is needed, should open with the hardware message and the recommendation checked', async () => {
    mockApi(withStatus());

    renderWithQuery(<InstallAssistant />);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Vamos preparar o HomeLab')).toBeInTheDocument();
    expect(screen.getByText(/Marcamos a aceleração CUDA/)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('checkbox', { name: 'Modelo small' })).toBeChecked(),
    );
    expect(screen.getByRole('checkbox', { name: 'Modelo base' })).not.toBeChecked();
    expect(screen.getByText(/Total a baixar: 1,1 GB/)).toBeInTheDocument();
  });

  it('when setup is not needed, should not open', async () => {
    const invoke = mockApi(withStatus(setupStatus({ needsSetup: false })));

    renderWithQuery(<InstallAssistant />);

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('when the user installs, should send only the selected non-required ids', async () => {
    const invoke = mockApi(withStatus());

    renderWithQuery(<InstallAssistant />);

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Modelo base' }));
    await userEvent.click(screen.getByRole('button', { name: 'Instalar' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.components.install)).toEqual([
        { ids: ['cuda-pack', 'model-small', 'model-base'] },
      ]),
    );
  });

  it('when installing fails, should show the error in a snackbar', async () => {
    mockApi({
      ...withStatus(),
      [IpcChannels.components.install]: () =>
        failure('PERSIST_FAILED', 'Sem permissão para gravar.'),
    });

    renderWithQuery(<InstallAssistant />);

    await userEvent.click(await screen.findByRole('button', { name: 'Instalar' }));

    expect(await screen.findByText('Sem permissão para gravar.')).toBeInTheDocument();
  });

  it('when a download is running, should show the overall progress and each item, and let the user cancel', async () => {
    const invoke = mockApi(withStatus());

    renderWithQuery(<InstallAssistant />);
    await screen.findByRole('dialog');

    act(() =>
      emitEvent(
        IpcEvents.componentsProgress,
        setupStatus({
          running: true,
          overall: { total: 2, done: 0, receivedBytes: 300, totalBytes: 1000 },
          components: [
            component({
              state: 'downloading',
              progress: { receivedBytes: 300, totalBytes: 1000 },
            }),
          ],
        }),
      ),
    );

    expect(await screen.findByText('Instalando o que o HomeLab precisa')).toBeInTheDocument();
    expect(screen.getByText('Instalando 0 de 2')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso da instalação' })).toHaveAttribute(
      'aria-valuenow',
      '30',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(payloadsOf(invoke, IpcChannels.components.cancel)).toHaveLength(1);
  });

  it('when running, should offer the details in Settings', async () => {
    const invoke = mockApi(withStatus());

    renderWithQuery(<InstallAssistant />);
    await screen.findByRole('dialog');

    act(() =>
      emitEvent(
        IpcEvents.componentsProgress,
        setupStatus({
          running: true,
          overall: { total: 1, done: 0, receivedBytes: 0, totalBytes: 10 },
        }),
      ),
    );

    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver detalhes nas Configurações' }),
    );

    expect(payloadsOf(invoke, IpcChannels.app.openSettings)).toEqual([{ section: 'components' }]);
  });

  it('when everything finishes, should say it is ready and close on conclude', async () => {
    mockApi(withStatus());

    renderWithQuery(<InstallAssistant />);
    await screen.findByRole('dialog');

    act(() =>
      emitEvent(IpcEvents.componentsProgress, setupStatus({ running: true, needsSetup: true })),
    );
    await screen.findByText('Instalando o que o HomeLab precisa');
    act(() =>
      emitEvent(IpcEvents.componentsProgress, setupStatus({ running: false, needsSetup: false })),
    );

    expect(await screen.findByText('Tudo pronto')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Concluir' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('when the user chooses "Agora não", should close the assistant', async () => {
    mockApi(withStatus());

    renderWithQuery(<InstallAssistant />);

    await userEvent.click(await screen.findByRole('button', { name: 'Agora não' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
