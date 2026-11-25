import { useRef } from 'react';
import { CircleAlert } from 'lucide-react';

import { HexStepMarker, type HexStepState } from '#components/Hex';
import { ProgressBar } from '#components/ProgressBar';
import { formatDateTime, formatDuration } from '#lib/format';
import { cn } from '#lib/utils';

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

const MARKER_STATE: Record<string, HexStepState> = {
  [JobStatusOptions.COMPLETED]: "done",
  [JobStatusOptions.RUNNING]: "running",
  [JobStatusOptions.FAILED]: "failed",
  [JobStatusOptions.PENDING]: "pending",
};

/**
 * Quanto da etapa já foi feito, de 0 a 100: concluída = 100; em andamento = a fração que ela informa
 * (sem medida, 0 até terminar: nunca um palpite); aguardando ou com falha = 0.
 */
export function stepFill(status: JobStatus, progress: Job["progress"]): number {
  if (status === JobStatusOptions.COMPLETED) {
    return 100;
  }

  if (status !== JobStatusOptions.RUNNING || !progress || !(progress.total > 0)) {
    return 0;
  }

  const finished = progress.unit === "percent" ? progress.done : progress.done - 1;

  return Math.round(Math.min(1, Math.max(0, finished / progress.total)) * 100);
}

/**
 * Estado sob o nome da etapa. Em andamento com medida: só o valor atual (`30%`, ou a parte); sem
 * medida: "em andamento". Concluída não diz nada: o ✓ do marcador já diz.
 */
export function stepStatusText(status: JobStatus, progress: Job['progress']): string {
  if (status === JobStatusOptions.COMPLETED) {
    return '';
  }

  if (status === JobStatusOptions.RUNNING && progress) {
    return progress.unit === 'percent'
      ? TrackStrings.stepPercent(progress.done)
      : TrackStrings.stepPart(progress.done, progress.total);
  }

  return TrackStrings.stepStates[status] ?? status;
}

/** Erro de uma etapa: ícone e texto em vermelho, sem caixa nem alerta. */
function StepError({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] text-destructive">
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
 * Interior do job: o pipeline como um painel de terminal, na horizontal e no ritmo do "Como usar" do
 * site: colmeia, etapa, colmeia, etapa... (a fila quebra de linha quando não cabe). Cada etapa tem a
 * sua colmeia (duas fileiras de 20 hexágonos) logo antes dela: o trabalho para chegar nela, vazia,
 * enchendo e pulsando completa. O marcador hexagonal da etapa se desenha, salta e solta um anel ao
 * concluir. Abaixo, o aviso de tentativa da IA (etapa em andamento) e o erro, quando há; no fim,
 * início, fim e duração.
 */
export function JobPipeline({ job }: JobPipelineProps) {
  const rows = pipelineRows(job);
  // O estado de cada etapa quando o pipeline apareceu: a que já estava assim não anima (job já concluído
  // aberto depois: tudo pronto e parado, sem peso). Só muda com animação o que muda com ele na tela.
  const initialStatus = useRef<Record<string, JobStatus>>(
    Object.fromEntries(rows.map((row) => [row.key, row.status])),
  );
  const runningRow = rows.find((row) => row.status === JobStatusOptions.RUNNING);
  const done = rows.filter((row) => row.status === JobStatusOptions.COMPLETED).length;
  // Terminou tudo: as colmeias param de pulsar, para não parecer que ainda há trabalho.
  const allDone = rows.length > 0 && done === rows.length;
  const started = job.startedAt ? new Date(job.startedAt).getTime() : null;
  const finished = job.completedAt ? new Date(job.completedAt).getTime() : null;

  return (
    <div className="flex flex-col gap-3 rounded-[4px] border bg-muted/30 p-3 font-mono">
      <p className="flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>
          <span className="text-primary">$</span> {TrackStrings.pipeline}
        </span>
        <span>{TrackStrings.pipelineCount(done, rows.length)}</span>
      </p>

      <ol aria-label={TrackStrings.pipeline} className="flex flex-wrap items-start gap-y-4">
        {rows.map((row) => {
          const running = row.status === JobStatusOptions.RUNNING;

          return (
            <li key={row.key} data-status={row.status} className="flex items-start">
              {/* A colmeia vem antes da etapa: é o trabalho para chegar nela. Sempre determinada: sem medida fica vazia, nunca num "um terço" que parece já ter andado. */}
              <ProgressBar
                value={stepFill(row.status, job.progress)}
                total={100}
                label={TrackStrings.stepProgress(row.label)}
                pulse={!allDone}
                className="mt-2 w-36"
              />

              <div className="flex w-[5.5rem] flex-col items-center gap-1 text-center">
                <HexStepMarker
                  state={MARKER_STATE[row.status]}
                  animate={initialStatus.current[row.key] !== row.status}
                  className="h-7 w-6"
                />

                <span
                  className={cn(
                    "min-h-7 text-[11px] leading-tight break-words transition-colors duration-300",
                    row.status === JobStatusOptions.PENDING && "text-muted-foreground",
                    running && "font-medium text-foreground",
                    row.status === JobStatusOptions.FAILED && "font-medium text-destructive",
                  )}
                >
                  {row.label}
                </span>

                {/* Altura reservada: o estado entra (ou não, em "concluído") sem empurrar o resto. */}
                <span
                  className={cn(
                    'min-h-4 text-[10px] text-muted-foreground',
                    running && job.progress && 'font-medium text-primary',
                  )}
                >
                  {stepStatusText(row.status, job.progress)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Altura mínima: a tentativa da IA e o erro entram sem empurrar a tela. */}
      <div data-slot="pipeline-detail" className="flex min-h-9 flex-col gap-1">
        {job.note && runningRow && (
          <p className="text-[11px] break-words text-amber-500">{job.note}</p>
        )}

        {job.error && <StepError message={job.error} />}
      </div>

      <dl className="grid grid-cols-3 gap-3 border-t pt-3">
        <Fact
          label={TrackStrings.facts.started}
          value={job.startedAt ? formatDateTime(job.startedAt) : "—"}
        />
        <Fact
          label={TrackStrings.facts.finished}
          value={job.completedAt ? formatDateTime(job.completedAt) : "—"}
        />
        <Fact
          label={TrackStrings.facts.duration}
          value={started !== null && finished !== null ? formatDuration(finished - started) : "—"}
        />
      </dl>
    </div>
  );
}
