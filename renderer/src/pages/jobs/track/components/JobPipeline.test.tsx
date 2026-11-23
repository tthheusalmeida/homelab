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
