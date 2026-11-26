import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';

import type { Job } from '../../types/job.types';

import { JobPipeline, pipelineRows, stepFill, stepStatusText } from './JobPipeline';

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

describe('stepFill', () => {
  it.each([
    ['completed', undefined, 100],
    ['pending', undefined, 0],
    ['failed', { done: 2, total: 4 }, 0],
    ['running', undefined, 0],
    ['running', { done: 3, total: 4 }, 50],
    ['running', { done: 1, total: 4 }, 0],
    ['running', { done: 30, total: 100, unit: 'percent' as const }, 30],
    ['running', { done: 250, total: 100, unit: 'percent' as const }, 100],
    ['running', { done: 1, total: 0 }, 0],
  ])('when the step is %s and the measure is %j, should be %s%%', (status, progress, expected) => {
    expect(stepFill(status as Job['status'], progress)).toBe(expected);
  });
});

describe('stepStatusText', () => {
  it.each([
    ['completed', undefined, ''],
    ['completed', { done: 2, total: 4 }, ''],
    ['pending', undefined, 'aguardando'],
    ['failed', undefined, 'falhou'],
    ['running', undefined, 'em andamento'],
    ['running', { done: 2, total: 4 }, 'parte 2 de 4'],
    ['running', { done: 30, total: 100, unit: 'percent' as const }, '30%'],
  ])('when the step is %s and the measure is %j, should say "%s"', (status, progress, expected) => {
    expect(stepStatusText(status as Job['status'], progress)).toBe(expected);
  });
});

describe('JobPipeline', () => {
  it('when running, should list each step with its state and count the finished ones', () => {
    render(<JobPipeline job={makeJob()} />);

    const list = screen.getByRole('list', { name: 'pipeline' });

    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(within(list).queryByText('concluído')).not.toBeInTheDocument();
    expect(within(list).getByText('em andamento')).toBeInTheDocument();
    expect(within(list).getByText('aguardando')).toBeInTheDocument();
    expect(screen.getByText('1/3 etapas')).toBeInTheDocument();
  });

  it('when rendering the steps, should lay them in a row that wraps, with a hexagon marker in the state of each', () => {
    render(<JobPipeline job={makeJob()} />);

    const items = screen.getAllByRole('listitem');

    expect(screen.getByRole('list', { name: 'pipeline' })).toHaveClass('flex', 'flex-wrap');
    expect(
      items.map((item) => item.querySelector('[data-state]')?.getAttribute('data-state')),
    ).toEqual(['done', 'running', 'pending']);
  });

  it('when rendering the steps, should put a honeycomb of forty hexagons before each one, then the step', () => {
    render(<JobPipeline job={makeJob()} />);

    const items = screen.getAllByRole('listitem');

    expect(screen.getAllByRole('progressbar')).toHaveLength(3);

    items.forEach((item) => {
      expect(item.firstElementChild).toHaveAttribute('role', 'progressbar');
      expect(item.querySelectorAll('.hp-cell')).toHaveLength(40);
    });
  });

  it('when a step is completed, should show its honeycomb full and pulsing; the next ones empty', () => {
    render(<JobPipeline job={makeJob()} />);

    const [first, second, third] = screen.getAllByRole('progressbar');

    expect(first).toHaveAttribute('aria-valuenow', '100');
    expect(first).toHaveAttribute('data-complete', 'true');
    expect(second).toHaveAttribute('aria-valuenow', '0');
    expect(third).toHaveAttribute('aria-valuenow', '0');
  });

  it('when the running step has progress, should show the part and fill only its own honeycomb', () => {
    render(<JobPipeline job={makeJob({ progress: { done: 3, total: 4 } })} />);

    expect(screen.getByText('parte 3 de 4')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Em andamento: Converter áudio' }),
    ).toHaveAttribute('aria-valuenow', '50');
    expect(
      screen.getByRole('progressbar', { name: 'Em andamento: Transcrever' }),
    ).toHaveAttribute('aria-valuenow', '0');
  });

  it('when the running step reports a percent, should show "N% de 100%" and fill its honeycomb', () => {
    render(
      <JobPipeline job={makeJob({ progress: { done: 30, total: 100, unit: 'percent' } })} />,
    );

    expect(screen.getByText('30%')).toBeInTheDocument();
    expect(screen.getByText('30%')).toHaveClass('text-primary');
    expect(screen.queryByText(/de 100/)).not.toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Em andamento: Converter áudio' }),
    ).toHaveAttribute('aria-valuenow', '30');
  });

  it('when the running step has no measure, should keep its honeycomb empty, never a partial guess', () => {
    const { container } = render(<JobPipeline job={makeJob({ progress: undefined })} />);
    const running = screen.getByRole('progressbar', { name: 'Em andamento: Converter áudio' });

    expect(running).toHaveAttribute('aria-valuenow', '0');
    expect(running.querySelectorAll('[data-filled="true"]')).toHaveLength(0);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(0);
  });

  it('when a step is running, should pulse only its honeycomb: done and waiting ones stay still', () => {
    render(<JobPipeline job={makeJob({ progress: { done: 3, total: 4 } })} />);

    const [done, running, waiting] = screen.getAllByRole('progressbar');

    expect(done).toHaveAttribute('data-pulse', 'false');
    expect(running).toHaveAttribute('data-pulse', 'true');
    expect(waiting).toHaveAttribute('data-pulse', 'false');
  });

  it('when the running step moves to the next one, should move the pulse with it', () => {
    const { rerender } = render(<JobPipeline job={makeJob()} />);

    rerender(
      <JobPipeline
        job={makeJob({
          steps: [
            { name: 'download', label: 'Baixar vídeo', status: 'completed' },
            { name: 'audio', label: 'Converter áudio', status: 'completed' },
            { name: 'transcribe', label: 'Transcrever', status: 'running' },
          ],
        })}
      />,
    );

    const pulses = screen.getAllByRole('progressbar').map((bar) => bar.getAttribute('data-pulse'));

    expect(pulses).toEqual(['false', 'false', 'true']);
  });

  it('when every step is completed, should stop every pulse: nothing moves anymore', () => {
    render(
      <JobPipeline
        job={makeJob({
          status: 'completed',
          steps: [
            { name: 'a', label: 'Baixar vídeo', status: 'completed' },
            { name: 'b', label: 'Transcrever', status: 'completed' },
          ],
        })}
      />,
    );

    screen.getAllByRole('progressbar').forEach((bar) => {
      expect(bar).toHaveAttribute('data-complete', 'true');
      expect(bar).toHaveAttribute('data-pulse', 'false');
    });
  });

  it('when the pipeline appears with finished steps, should show them ready and still', () => {
    render(<JobPipeline job={makeJob()} />);

    const [completed, running] = screen.getAllByRole('listitem');

    expect(completed.querySelector('[data-state]')).toHaveAttribute('data-static', 'true');
    expect(running.querySelector('[data-state]')).toHaveAttribute('data-static', 'true');
  });

  it('when a step completes with the pipeline on screen, should animate it and keep the others still', () => {
    const { rerender } = render(<JobPipeline job={makeJob()} />);

    rerender(
      <JobPipeline
        job={makeJob({
          steps: [
            { name: 'download', label: 'Baixar vídeo', status: 'completed' },
            { name: 'audio', label: 'Converter áudio', status: 'completed' },
            { name: 'transcribe', label: 'Transcrever', status: 'running' },
          ],
        })}
      />,
    );

    const [first, second, third] = screen
      .getAllByRole('listitem')
      .map((item) => item.querySelector('[data-state]'));

    expect(first).toHaveAttribute('data-static', 'true');
    expect(second).toHaveAttribute('data-static', 'false');
    expect(third).toHaveAttribute('data-static', 'false');
  });

  it('when the job has not started, should keep every honeycomb empty', () => {
    render(<JobPipeline job={makeJob({ status: 'pending', steps: [] })} />);

    screen.getAllByRole('progressbar').forEach((bar) => {
      expect(bar).toHaveAttribute('aria-valuenow', '0');
    });
  });

  it('when a step is completed, should say nothing under its name but keep the space', () => {
    render(<JobPipeline job={makeJob()} />);

    const [completed] = screen.getAllByRole('listitem');
    const status = completed.querySelectorAll('span')[2];

    expect(status).toBeEmptyDOMElement();
    expect(status).toHaveClass('min-h-4');
  });

  it('when rendering the steps, should reserve height for the name, the state and the detail', () => {
    const { container } = render(<JobPipeline job={makeJob()} />);
    const [first] = screen.getAllByRole('listitem');

    expect(within(first).getByText('Baixar vídeo')).toHaveClass('min-h-7');
    expect(container.querySelector('[data-slot="pipeline-detail"]')).toHaveClass('min-h-9');
  });

  it('when the AI is retrying, should show the attempt while a step runs', () => {
    render(
      <JobPipeline
        job={makeJob({ note: 'Tentando de novo (tentativa 2 de 3): serviço sobrecarregado' })}
      />,
    );

    expect(screen.getByText(/tentativa 2 de 3/)).toBeInTheDocument();
  });

  it('when the retry was solved and the note is gone, should not show the attempt anymore', () => {
    const { rerender } = render(
      <JobPipeline job={makeJob({ note: 'Tentando de novo (tentativa 2 de 3): erro' })} />,
    );

    rerender(<JobPipeline job={makeJob({ note: undefined })} />);

    expect(screen.queryByText(/tentativa/)).not.toBeInTheDocument();
  });

  it('when a step failed, should mark it in red and show the error once', () => {
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

    expect(screen.getAllByText('Limite de uso da IA.')).toHaveLength(1);
    expect(rows[1].querySelector('[data-state]')).toHaveAttribute('data-state', 'failed');
    expect(within(rows[1]).getByText('falhou')).toBeInTheDocument();
  });

  it('when the job failed without a failed step, should still show the error', () => {
    render(
      <JobPipeline
        job={makeJob({
          status: 'failed',
          error: 'Cancelado pelo usuário.',
          steps: [{ name: 'download', label: 'Baixar vídeo', status: 'pending' }],
        })}
      />,
    );

    expect(screen.getByText('Cancelado pelo usuário.')).toBeInTheDocument();
  });

  it('when the job was resumed and has no error, should show no alert', () => {
    render(<JobPipeline job={makeJob({ error: undefined })} />);

    expect(screen.queryByText(/Falhou|erro/i)).not.toBeInTheDocument();
  });

  it('when a step has an error, should show a red message with an icon, not an alert box', () => {
    const { container } = render(
      <JobPipeline
        job={makeJob({
          status: 'failed',
          error: 'Sem internet.',
          steps: [{ name: 'download', label: 'Baixar vídeo', status: 'failed' }],
        })}
      />,
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Sem internet.').closest('p')).toHaveClass('text-destructive');
    expect(container.querySelector('svg.lucide-circle-alert')).toBeInTheDocument();
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
