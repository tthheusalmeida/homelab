import { useNow } from "#hooks/use-now";
import { formatDuration } from "#lib/format";

import { JobStatusOptions, type Job } from "../../types/job.types";
import { TrackStrings } from "../strings";

interface JobLiveProgressProps {
  job: Pick<Job, "status" | "steps" | "startedAt" | "cancelRequested">;
}

/**
 * Linha ao vivo de um job ativo: etapa atual (n/total), nome da etapa e tempo decorrido. Andamento,
 * tentativas da IA e erros ficam na etapa correspondente do pipeline, não aqui.
 * Job na fila mostra só "na fila". Não aparece para jobs que já terminaram.
 */
export function JobLiveProgress({ job }: JobLiveProgressProps) {
  const running = job.status === JobStatusOptions.RUNNING;
  const now = useNow(1000, running);

  if (job.status === JobStatusOptions.PENDING) {
    return <p className="font-mono text-xs text-muted-foreground">{TrackStrings.queued}</p>;
  }

  if (!running) {
    return null;
  }

  const steps = job.steps ?? [];
  const index = steps.findIndex((step) => step.status === JobStatusOptions.RUNNING);
  const elapsed = job.startedAt ? Math.max(0, now - new Date(job.startedAt).getTime()) : null;

  return (
    <p className="flex flex-wrap items-center gap-x-3 font-mono text-xs text-muted-foreground">
      {index >= 0 && (
        <span className="text-foreground">
          {TrackStrings.step(index + 1, steps.length, steps[index].label)}
        </span>
      )}

      {elapsed !== null && <span>{formatDuration(Math.floor(elapsed / 1000) * 1000)}</span>}

      {job.cancelRequested && <span className="text-amber-500">{TrackStrings.cancelling}</span>}
    </p>
  );
}
