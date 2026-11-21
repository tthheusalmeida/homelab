import { describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import { SnackbarProvider } from '../../../../components/Snackbar';
import { createTestQueryClient } from '../../../../test/utils';

import { LeftoversControl } from './LeftoversControl';

function setup(handlers: Record<string, (payload: unknown) => unknown>) {
  const client = createTestQueryClient();
  const invoke = mockApi(handlers);

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SnackbarProvider>{children}</SnackbarProvider>
      </QueryClientProvider>
    );
  }

  render(<LeftoversControl />, { wrapper: Wrapper });

  return invoke;
}

const open = () =>
  userEvent.click(screen.getByRole('button', { name: 'Limpar arquivos temporários' }));

describe('LeftoversControl', () => {
  it('when nothing was left behind, should say so and not open the confirmation', async () => {
    setup({ [IpcChannels.jobs.leftovers]: () => ok({ files: 0, bytes: 0 }) });

    await open();

    expect(
      await screen.findByText(/não há arquivos de processos não terminados/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apagar' })).not.toBeInTheDocument();
  });

  it('when there are leftovers, should show how many files and how much space before deleting', async () => {
    const invoke = setup({
      [IpcChannels.jobs.leftovers]: () => ok({ files: 12, bytes: 2_097_152 }),
    });

    await open();

    expect(await screen.findByText(/12 arquivos \(2,0 MB\)/)).toBeInTheDocument();
    expect(screen.getByText(/não poderão mais ser continuados/i)).toBeInTheDocument();
    expect(invoke).not.toHaveBeenCalledWith(IpcChannels.jobs.cleanLeftovers);
  });

  it('when the user gives up, should delete nothing', async () => {
    const invoke = setup({ [IpcChannels.jobs.leftovers]: () => ok({ files: 3, bytes: 1024 }) });

    await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Cancelar' }));

    expect(invoke).not.toHaveBeenCalledWith(IpcChannels.jobs.cleanLeftovers);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Apagar' })).not.toBeInTheDocument(),
    );
  });

  it('when confirmed, should clean, report what was freed and close the dialog', async () => {
    const invoke = setup({
      [IpcChannels.jobs.leftovers]: () => ok({ files: 3, bytes: 3072 }),
      [IpcChannels.jobs.cleanLeftovers]: () => ok({ files: 3, bytes: 3072, failed: 0 }),
      [IpcChannels.jobs.list]: () => ok([]),
    });

    await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Apagar' }));

    expect(await screen.findByText(/3 arquivos apagados/)).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.cleanLeftovers);
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Apagar' })).not.toBeInTheDocument(),
    );
  });

  it('when some item was in use, should tell how many could not be deleted', async () => {
    setup({
      [IpcChannels.jobs.leftovers]: () => ok({ files: 2, bytes: 100 }),
      [IpcChannels.jobs.cleanLeftovers]: () => ok({ files: 1, bytes: 50, failed: 1 }),
      [IpcChannels.jobs.list]: () => ok([]),
    });

    await open();
    await userEvent.click(await screen.findByRole('button', { name: 'Apagar' }));

    expect(await screen.findByText(/1 item em uso não pôde ser apagado/)).toBeInTheDocument();
  });

  it('when measuring fails, should show the error', async () => {
    setup({ [IpcChannels.jobs.leftovers]: () => failure('INTERNAL', 'Falha ao medir.') });

    await open();

    expect(await screen.findByText('Falha ao medir.')).toBeInTheDocument();
  });
});
