import type { CSSProperties } from "react";

import type { Job } from "../../types/job.types";

import { JobListItem } from "./JobListItem";

interface JobListProps {
  jobs: Job[];
  /** Modo de seleção: mostra a caixa de cada job. */
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onSelectedChange?: (id: string, checked: boolean) => void;
}

export function JobList({
  jobs,
  selectable = false,
  selectedIds,
  onSelectedChange,
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
          />
        </div>
      ))}
    </div>
  );
}
