import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../ai/chat/hooks/useAiProviders', () => ({
  useAiProviders: () => ({ data: [{ id: 'ollama', label: 'Ollama' }], isLoading: false }),
}));
vi.mock('../../ai/chat/hooks/useAiModels', () => ({
  useAiModels: () => ({ data: [{ id: 'qwen', label: 'Qwen' }], isLoading: false }),
}));
vi.mock('../../ai/chat/hooks/useAiThinking', () => ({
  useAiThinking: () => ({ data: [{ id: 'off', label: 'Desativado' }], isLoading: false }),
}));
vi.mock('#components/OptionSelect', () => ({
  OptionSelect: ({
    placeholder,
    options,
    value,
    disabled,
    onValueChange,
  }: {
    placeholder: string;
    options: { id: string; label: string }[];
    value?: string;
    disabled?: boolean;
    onValueChange: (value: string | null) => void;
  }) => (
    <select
      aria-label={placeholder}
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value || null)}
    >
      <option value="">-</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

import { IpcChannels } from '#shared/channels';
import { mockApi, ok, payloadsOf } from '#test/api-mock';

import { SnackbarProvider } from '../../../components/Snackbar';
import { createTestQueryClient } from '../../../test/utils';
import type { Job } from '../types/job.types';

import { TrackPage } from './TrackPage';

const pdfJob = (extra: Partial<Job> = {}): Job => ({
  id: 'p1',
  name: 'pdf-to-summary',
  label: 'Resumo de PDF',
  status: 'failed',
  createdAt: '2026-01-01T10:00:00.000Z',
  completedAt: '',
  error: 'Interrompido ao fechar o app.',
  retryable: true,
  resume: { done: 3, total: 8 },
  steps: [],
  ...extra,
});

function setup(jobs: Job[], handlers: Record<string, (payload: unknown) => unknown> = {}) {
  const client = createTestQueryClient();
  const invoke = mockApi({
    [IpcChannels.jobs.list]: () => ok(jobs),
    [IpcChannels.jobs.retry]: () => ok({ id: 'new', status: 'pending' }),
    ...handlers,
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SnackbarProvider>{children}</SnackbarProvider>
      </QueryClientProvider>
    );
  }

  render(<TrackPage />, { wrapper: Wrapper });

  return invoke;
}

describe('TrackPage — resumo de PDF', () => {
  it('when a pdf job stopped halfway, should show how many parts are saved on disk', async () => {
    setup([pdfJob()]);

    expect(await screen.findByText(/3 de 8 partes já estão salvas em disco/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '38');
  });

  it('when a pdf job has no progress left, should not show the saved parts', async () => {
    setup([pdfJob({ resume: undefined })]);

    await screen.findByText('Resumo de PDF');

    expect(screen.queryByText(/já estão salvas em disco/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Trocar modelo' })).not.toBeInTheDocument();
  });

  it('when only one part is saved, should use the singular', async () => {
    setup([pdfJob({ resume: { done: 1, total: 1 } })]);

    expect(await screen.findByText(/1 de 1 parte já está salva/)).toBeInTheDocument();
  });

  it('when retrying a pdf job with the same model, should send only its id', async () => {
    const invoke = setup([pdfJob()]);

    await userEvent.click(await screen.findByRole('button', { name: /tentar de novo/i }));

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.jobs.retry)).toEqual([{ id: 'p1' }]));
  });

  it('when changing the model, should continue the job with the chosen model', async () => {
    const invoke = setup([pdfJob()]);
    const user = userEvent.setup();

    await user.click(await screen.findByRole('button', { name: 'Trocar modelo' }));
    expect(
      screen.getByText(/3 de 8 partes já estão prontas e não serão refeitas/),
    ).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Provedor'), 'ollama');
    await user.selectOptions(screen.getByLabelText('Modelo'), 'qwen');
    await user.selectOptions(screen.getByLabelText('Thinking'), 'off');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.jobs.retry)).toEqual([
        { id: 'p1', providerId: 'ollama', modelId: 'qwen', thinking: 'off' },
      ]),
    );
    await waitFor(() => expect(screen.queryByText(/não serão refeitas/)).not.toBeInTheDocument());
  });

  it('when a video job failed, should not offer to change the model', async () => {
    setup([pdfJob({ name: 'video-to-summary', resume: undefined })]);

    await screen.findByText('Resumo de PDF');

    expect(screen.queryByRole('button', { name: 'Trocar modelo' })).not.toBeInTheDocument();
  });

  it('when there are no jobs, should still offer to clean leftover files', async () => {
    setup([]);

    expect(
      await screen.findByRole('button', { name: 'Limpar arquivos temporários' }),
    ).toBeInTheDocument();
  });

  it('when there are jobs, should offer the cleaning next to the other actions', async () => {
    setup([pdfJob()]);

    expect(
      await screen.findByRole('button', { name: 'Limpar arquivos temporários' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selecionar' })).toBeInTheDocument();
  });
});
