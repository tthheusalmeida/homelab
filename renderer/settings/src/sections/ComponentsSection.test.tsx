import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IpcChannels } from '#shared/channels';
import { component, setupStatus } from '#test/components-fixtures';
import { failure, mockApi, ok, payloadsOf, renderWithProviders } from '../testing';

import { ComponentsSection } from './ComponentsSection';

const installedStatus = () =>
  setupStatus({
    needsSetup: false,
    components: [
      component({ id: 'model-small', label: 'Modelo small', state: 'installed', active: true }),
      component({ id: 'model-base', label: 'Modelo base', state: 'installed' }),
      component({ id: 'model-medium', label: 'Modelo medium', state: 'missing' }),
    ],
  });

const handlers = (status = installedStatus()) => ({
  [IpcChannels.components.status]: () => ok(status),
  [IpcChannels.components.install]: () => ok({ ...status, running: true }),
  [IpcChannels.components.cancel]: () => ok(undefined),
  [IpcChannels.components.remove]: () => ok(status),
  [IpcChannels.components.setActiveModel]: () => ok(status),
});

const row = (label: string) => screen.getByRole('checkbox', { name: label }).closest('li')!;

describe('ComponentsSection', () => {
  it('when loaded, should show the hardware card and the component list', async () => {
    mockApi(handlers());

    renderWithProviders(<ComponentsSection />);

    expect(await screen.findByText('Seu computador')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Modelo medium' })).toBeInTheDocument();
  });

  it('when a model is installed and not in use, should offer Usar and Remover; the active one only keeps its badge', async () => {
    mockApi(handlers());

    renderWithProviders(<ComponentsSection />);
    await screen.findByText('Seu computador');

    expect(within(row('Modelo base')).getByRole('button', { name: 'Usar' })).toBeInTheDocument();
    expect(within(row('Modelo base')).getByRole('button', { name: 'Remover' })).toBeInTheDocument();
    expect(within(row('Modelo small')).queryByRole('button')).not.toBeInTheDocument();
    expect(within(row('Modelo small')).getByText('Em uso')).toBeInTheDocument();
  });

  it('when the user picks Usar, should switch the active model and confirm', async () => {
    const invoke = mockApi(handlers());

    renderWithProviders(<ComponentsSection />);
    await screen.findByText('Seu computador');

    await userEvent.click(within(row('Modelo base')).getByRole('button', { name: 'Usar' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.components.setActiveModel)).toEqual([
        { id: 'model-base' },
      ]),
    );
    expect(await screen.findByText('Modelo base agora está em uso.')).toBeInTheDocument();
  });

  it('when the user picks Remover, should remove the component and confirm', async () => {
    const invoke = mockApi(handlers());

    renderWithProviders(<ComponentsSection />);
    await screen.findByText('Seu computador');

    await userEvent.click(within(row('Modelo base')).getByRole('button', { name: 'Remover' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.components.remove)).toEqual([{ id: 'model-base' }]),
    );
    expect(await screen.findByText('Modelo base removido.')).toBeInTheDocument();
  });

  it('when the user selects a missing model and installs, should send its id', async () => {
    const invoke = mockApi(handlers());

    renderWithProviders(<ComponentsSection />);

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Modelo medium' }));
    await userEvent.click(screen.getByRole('button', { name: 'Instalar selecionados' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.components.install)).toEqual([
        { ids: ['model-medium'] },
      ]),
    );
  });

  it('when nothing is selected, should keep the install button disabled', async () => {
    mockApi(handlers());

    renderWithProviders(<ComponentsSection />);

    expect(await screen.findByRole('button', { name: 'Instalar selecionados' })).toBeDisabled();
    expect(screen.getByText('Tudo o que você marcou já está instalado.')).toBeInTheDocument();
  });

  it('when removing fails, should show the error', async () => {
    mockApi({
      ...handlers(),
      [IpcChannels.components.remove]: () =>
        failure('VALIDATION', 'Este é o modelo em uso. Escolha outro modelo antes de removê-lo.'),
    });

    renderWithProviders(<ComponentsSection />);
    await screen.findByText('Seu computador');

    await userEvent.click(within(row('Modelo base')).getByRole('button', { name: 'Remover' }));

    expect(await screen.findByText(/Este é o modelo em uso/)).toBeInTheDocument();
  });

  it('when an installation is running, should show the overall progress, hide item actions and offer Cancelar', async () => {
    const invoke = mockApi(
      handlers({
        ...installedStatus(),
        running: true,
        overall: { total: 2, done: 1, receivedBytes: 500, totalBytes: 1000 },
      }),
    );

    renderWithProviders(<ComponentsSection />);

    expect(await screen.findByText('Instalando 1 de 2')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Usar' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(payloadsOf(invoke, IpcChannels.components.cancel)).toHaveLength(1);
  });

  it('when reading the status fails, should show the error with a retry action', async () => {
    mockApi({
      [IpcChannels.components.status]: () => failure('INTERNAL', 'falhou'),
    });

    renderWithProviders(<ComponentsSection />);

    expect(await screen.findByText('Não foi possível ler os componentes.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });
});
