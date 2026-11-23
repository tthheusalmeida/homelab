import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import type { Job } from '../../types/job.types';

import { JobPipeline, pipelineRows } from './JobPipeline';

const makeJob = (overrides: Partial<Job> = {}): Job => ({
  id: 'job-1',
  name: 'video-to-summary',
  label: 'Resumo de vídeo',
  status: 'running',
  createdAt: '2026-01-01T10:00:00.000Z',
  startedAt: '2026-01-01T10:00:05.000Z',
  completedAt: '',
  steps: [
    { name: 'download', label: 'Baixar vídeo', status: 'completed' },
    { name: 'audio', label: 'Converter áudio', status: 'running' },
    { name: 'transcribe', label: 'Transcrever', status: 'pending' },
  ],
  ...overrides,
});

describe('pipelineRows', () => {
  it('when the job has steps, should use them in order', () => {
    expect(pipelineRows(makeJob()).map((row) => row.label)).toEqual([
      'Baixar vídeo',
      'Converter áudio',
      'Transcrever',
    ]);
  });

  it.each([
    ['pending', ['running', 'pending', 'pending']],
    ['running', ['completed', 'running', 'pending']],
    ['completed', ['completed', 'completed', 'completed']],
    ['failed', ['completed', 'failed', 'pending']],
  ])(
    'when the job is %s and has no steps, should show the three general phases',
    (status, expected) => {
      const rows = pipelineRows(makeJob({ status, steps: [] }));

      expect(rows.map((row) => row.status)).toEqual(expected);
    },
  );
});

describe('JobPipeline', () => {
  it('when running, should list each step with its state and count the finished ones', () => {
    render(<JobPipeline job={makeJob()} />);

    const list = screen.getByRole('list', { name: 'pipeline' });

    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).getByText('concluído')).toBeInTheDocument();
    expect(within(list).getByText('em andamento')).toBeInTheDocument();
    expect(within(list).getByText('aguardando')).toBeInTheDocument();
    expect(screen.getByText('1/3 etapas')).toBeInTheDocument();
  });

  it('when a step is running, should show a thin progress bar only on it', () => {
    render(<JobPipeline job={makeJob()} />);

    expect(screen.getAllByRole('progressbar')).toHaveLength(1);
    expect(
      screen.getByRole('progressbar', { name: 'Em andamento: Converter áudio' }),
    ).toBeInTheDocument();
  });

  it('when the running step has progress, should show the part and a determinate bar', () => {
    render(<JobPipeline job={makeJob({ progress: { done: 2, total: 4 } })} />);

    expect(screen.getByText('parte 2 de 4')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Em andamento: Converter áudio' }),
    ).toHaveAttribute('aria-valuenow', '25');
  });

  it('when the running step reports a percent, should show "N% de 100%" and fill the bar', () => {
    render(<JobPipeline job={makeJob({ progress: { done: 10, total: 100, unit: 'percent' } })} />);

    expect(screen.getByText('10% de 100%')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Em andamento: Converter áudio' }),
    ).toHaveAttribute('aria-valuenow', '10');
  });

  it('when the AI is retrying, should show the attempt inside the running step only', () => {
    render(
      <JobPipeline
        job={makeJob({ note: 'Tentando de novo (tentativa 2 de 3): serviço sobrecarregado' })}
      />,
    );

    const rows = screen.getAllByRole('listitem');

    expect(within(rows[1]).getByRole('status')).toHaveTextContent('tentativa 2 de 3');
    expect(within(rows[0]).queryByRole('status')).not.toBeInTheDocument();
    expect(within(rows[2]).queryByRole('status')).not.toBeInTheDocument();
  });

  it('when the retry was solved and the note is gone, should not show the attempt anymore', () => {
    const { rerender } = render(
      <JobPipeline job={makeJob({ note: 'Tentando de novo (tentativa 2 de 3): erro' })} />,
    );

    rerender(<JobPipeline job={makeJob({ note: undefined })} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('when a step failed, should show the error inside that step and not again at the end', () => {
    render(
      <JobPipeline
        job={makeJob({
          status: 'failed',
          error: 'Limite de uso da IA.',
          steps: [
            { name: 'download', label: 'Baixar vídeo', status: 'completed' },
            { name: 'audio', label: 'Converter áudio', status: 'failed' },
            { name: 'transcribe', label: 'Transcrever', status: 'pending' },
          ],
        })}
      />,
    );

    const rows = screen.getAllByRole('listitem');

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(within(rows[1]).getByRole('alert')).toHaveTextContent('Limite de uso da IA.');
  });

  it('when the job failed without a failed step, should keep the error at the end', () => {
    render(
      <JobPipeline
        job={makeJob({
          status: 'failed',
          error: 'Cancelado pelo usuário.',
          steps: [{ name: 'download', label: 'Baixar vídeo', status: 'pending' }],
        })}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Cancelado pelo usuário.');
    expect(within(screen.getAllByRole('listitem')[0]).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('when the job was resumed and has no error, should show no alert in any step', () => {
    render(
      <JobPipeline
        job={makeJob({
          status: 'running',
          error: undefined,
          steps: [
            { name: 'download', label: 'Baixar vídeo', status: 'completed' },
            { name: 'audio', label: 'Converter áudio', status: 'running' },
          ],
        })}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('when rendering the steps, should reserve a minimum height for each one', () => {
    render(<JobPipeline job={makeJob()} />);

    screen.getAllByRole('listitem').forEach((row) => expect(row).toHaveClass('min-h-12'));
  });

  it('when the job failed, should show the error as an alert', () => {
    render(
      <JobPipeline
        job={makeJob({
          status: 'failed',
          error: 'ffmpeg não encontrado.',
          steps: [{ name: 'audio', label: 'Converter áudio', status: 'failed' }],
        })}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('ffmpeg não encontrado.');
    expect(screen.getByText('falhou')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('when the job finished, should show start, end and duration', () => {
    render(
      <JobPipeline
        job={makeJob({
          status: 'completed',
          completedAt: '2026-01-01T10:01:05.000Z',
          steps: [{ name: 'a', label: 'Baixar vídeo', status: 'completed' }],
        })}
      />,
    );

    expect(screen.getByText('Duração').nextElementSibling).toHaveTextContent('1m');
    expect(screen.getByText('Fim').nextElementSibling).not.toHaveTextContent('—');
  });

  it('when the job has not started, should show dashes for the times', () => {
    render(<JobPipeline job={makeJob({ status: 'pending', startedAt: undefined })} />);

    expect(screen.getByText('Início').nextElementSibling).toHaveTextContent('—');
    expect(screen.getByText('Duração').nextElementSibling).toHaveTextContent('—');
  });
});
