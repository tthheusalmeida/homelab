import { Check, CircleAlert, X } from 'lucide-react';

import { HexDot } from '#components/Hex';
import { ProgressBar } from '#components/ProgressBar';
import { formatDateTime, formatDuration } from '#lib/format';
import { cn } from '#lib/utils';
import { Collapsible, CollapsibleContent } from '#ui/collapsible';

import { type Job, type JobStatus, JobStatusOptions } from '../../types/job.types';
import { TrackStrings } from '../strings';

interface PipelineRow {
  key: string;
  label: string;
  status: JobStatus;
}

/**
 * Etapas do job. Sem etapas detalhadas (job que ainda não começou ou antigo), mostra as três fases
 * gerais, para a lista nunca ficar vazia.
 */
export function pipelineRows(job: Pick<Job, 'status' | 'steps'>): PipelineRow[] {
  if (job.steps && job.steps.length > 0) {
    return job.steps.map((step) => ({
      key: step.name,
      label: step.label,
      status: step.status,
    }));
  }

  const queued = job.status === JobStatusOptions.PENDING;
  const running = job.status === JobStatusOptions.RUNNING;
  const failed = job.status === JobStatusOptions.FAILED;

  return [
    {
      key: 'queue',
      label: TrackStrings.phases.queue,
      status: queued ? JobStatusOptions.RUNNING : JobStatusOptions.COMPLETED,
    },
    {
      key: 'process',
      label: TrackStrings.phases.process,
      status: running
        ? JobStatusOptions.RUNNING
        : failed
          ? JobStatusOptions.FAILED
          : queued
            ? JobStatusOptions.PENDING
            : JobStatusOptions.COMPLETED,
    },
    {
      key: 'done',
      label: TrackStrings.phases.done,
      status:
        job.status === JobStatusOptions.COMPLETED
          ? JobStatusOptions.COMPLETED
          : JobStatusOptions.PENDING,
    },
  ];
}

const MARKER: Record<string, string> = {
  [JobStatusOptions.COMPLETED]: 'bg-emerald-500',
  [JobStatusOptions.RUNNING]: 'bg-primary',
  [JobStatusOptions.FAILED]: 'bg-destructive',
  [JobStatusOptions.PENDING]: 'bg-muted-foreground/40',
};

function Marker({ status }: { status: JobStatus }) {
  return (
    <span className="relative flex size-5 shrink-0 items-center justify-center">
      <HexDot
        pulse={status === JobStatusOptions.RUNNING}
        className={cn('size-3.5 transition-colors duration-300', MARKER[status])}
      />

      {status === JobStatusOptions.COMPLETED && (
        <Check
          aria-hidden
          className="absolute size-2 animate-enter-scale stroke-[4] text-background"
        />
      )}

      {status === JobStatusOptions.FAILED && (
        <X aria-hidden className="absolute size-2 animate-enter-scale stroke-[4] text-background" />
      )}
    </span>
  );
}

/** Erro de uma etapa: ícone e texto em vermelho, sem caixa nem alerta. */
function StepError({ message }: { message: string }) {
  return (
    <p title={message} className="flex items-start gap-1.5 text-[11px] text-destructive">
      <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />

      <span className="min-w-0 break-words">{message}</span>
    </p>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="truncate text-xs">{value}</dd>
    </div>
  );
}

interface JobPipelineProps {
  job: Job;
}

/**
 * Interior do job: o pipeline como um painel de terminal. Cada etapa é uma linha com marcador
 * hexagonal (a mesma linguagem da marca), nome, estado e uma barra fina na etapa em execução. Abaixo,
 * início, fim e duração, e o erro quando o job falhou.
 */
export function JobPipeline({ job }: JobPipelineProps) {
  const rows = pipelineRows(job);
  // O erro aparece na etapa em que ocorreu; sem etapa com falha (cancelado na fila, por exemplo), fica no fim.
  const failedKey = rows.findLast((row) => row.status === JobStatusOptions.FAILED)?.key;
  const done = rows.filter((row) => row.status === JobStatusOptions.COMPLETED).length;
  const started = job.startedAt ? new Date(job.startedAt).getTime() : null;
  const finished = job.completedAt ? new Date(job.completedAt).getTime() : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-3 font-mono">
      <p className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>
          <span className="text-primary">$</span> {TrackStrings.pipeline}
        </span>
        <span>{TrackStrings.pipelineCount(done, rows.length)}</span>
      </p>

      <ol aria-label={TrackStrings.pipeline} className="flex flex-col">
        {rows.map((row, index) => {
          const running = row.status === JobStatusOptions.RUNNING;
          const showError = Boolean(job.error) && row.key === failedKey;
          // Só a etapa em questão abre o espaço de andamento, tentativa e erro; as outras ficam recolhidas.
          const expanded = running || row.status === JobStatusOptions.FAILED;

          return (
            <li
              key={row.key}
              data-status={row.status}
              className="relative flex gap-3 pb-3 last:pb-0"
            >
              {index < rows.length - 1 && (
                <span
                  aria-hidden
                  className={cn(
                    'absolute top-5 bottom-0 left-2.5 w-px -translate-x-1/2',
                    row.status === JobStatusOptions.COMPLETED ? 'bg-emerald-500/50' : 'bg-border',
                  )}
                />
              )}

              <Marker status={row.status} />

              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className={cn(
                      'min-w-0 truncate text-xs transition-colors duration-300',
                      row.status === JobStatusOptions.PENDING && 'text-muted-foreground',
                      running && 'font-medium text-foreground',
                      row.status === JobStatusOptions.FAILED && 'font-medium text-destructive',
                    )}
                  >
                    {row.label}
                  </span>

                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {running && job.progress
                      ? job.progress.unit === 'percent'
                        ? TrackStrings.stepPercent(job.progress.done)
                        : TrackStrings.stepPart(job.progress.done, job.progress.total)
                      : (TrackStrings.stepStates[row.status] ?? row.status)}
                  </span>
                </div>

                {/* O espaço tem altura mínima: a mensagem entra sem empurrar o que há dentro da etapa. Abre e fecha com a transição de altura do app. */}
                <Collapsible open={expanded}>
                  <CollapsibleContent>
                    <div data-slot="step-detail" className="flex min-h-9 flex-col gap-1">
                      {running && (
                        <ProgressBar
                          value={
                            job.progress
                              ? job.progress.unit === 'percent'
                                ? job.progress.done
                                : job.progress.done - 1
                              : 0
                          }
                          // sempre determinada: sem medida a barra fica em 0, nunca num "um terço" que parece já ter andado
                          total={job.progress?.total ?? 100}
                          label={TrackStrings.stepProgress(row.label)}
                          className="h-1"
                        />
                      )}

                      {running && job.note && (
                        <p title={job.note} className="text-[11px] break-words text-amber-500">
                          {job.note}
                        </p>
                      )}

                      {showError && <StepError message={job.error ?? ''} />}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </li>
          );
        })}
      </ol>

      {job.error && !failedKey && <StepError message={job.error} />}

      <dl className="grid grid-cols-3 gap-3 border-t pt-3">
        <Fact
          label={TrackStrings.facts.started}
          value={job.startedAt ? formatDateTime(job.startedAt) : '—'}
        />
        <Fact
          label={TrackStrings.facts.finished}
          value={job.completedAt ? formatDateTime(job.completedAt) : '—'}
        />
        <Fact
          label={TrackStrings.facts.duration}
          value={started !== null && finished !== null ? formatDuration(finished - started) : '—'}
        />
      </dl>
    </div>
  );
}
