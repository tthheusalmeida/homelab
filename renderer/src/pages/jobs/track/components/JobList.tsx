import type { CSSProperties } from "react";

import type { Job } from "../../types/job.types";

import { JobListItem } from "./JobListItem";

interface JobListProps {
  jobs: Job[];
  /** Modo de seleção: mostra a caixa de cada job. */
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onSelectedChange?: (id: string, checked: boolean) => void;
  onCancel?: (id: string) => void;
  onRetry?: (job: Job) => void;
  /** Job com cancelar ou tentar de novo em andamento (desabilita os botões dele). */
  busyId?: string;
}

export function JobList({
  jobs,
  selectable = false,
  selectedIds,
  onSelectedChange,
  onCancel,
  onRetry,
  busyId,
}: JobListProps) {
  const sortedJobs = [...jobs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="space-y-4">
      {sortedJobs.map((job, index) => (
        <div
          key={job.id}
          className="animate-enter"
          style={{ "--i": index } as CSSProperties}
        >
          <JobListItem
            job={job}
            selectable={selectable}
            selected={selectedIds?.has(job.id) ?? false}
            onSelectedChange={(checked) => onSelectedChange?.(job.id, checked)}
            onCancel={() => onCancel?.(job.id)}
            onRetry={() => onRetry?.(job)}
            busy={busyId === job.id}
          />
        </div>
      ))}
    </div>
  );
}
