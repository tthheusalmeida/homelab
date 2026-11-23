import { memo, useMemo, type CSSProperties } from "react";

import { useStableCallback } from "#hooks/use-stable-callback";

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
  onChangeModel?: (job: Job) => void;
  onGrantAccess?: (job: Job) => void;
  /** Job com cancelar, entrar no site ou tentar de novo em andamento (desabilita os botões dele). */
  busyId?: string;
}

interface JobRowProps {
  job: Job;
  index: number;
  selectable: boolean;
  selected: boolean;
  busy: boolean;
  onSelectedChange: (id: string, checked: boolean) => void;
  onCancel: (id: string) => void;
  onRetry: (job: Job) => void;
  onChangeModel: (job: Job) => void;
  onGrantAccess: (job: Job) => void;
}

const JobRow = memo(function JobRow({
  job,
  index,
  selectable,
  selected,
  busy,
  onSelectedChange,
  onCancel,
  onRetry,
  onChangeModel,
  onGrantAccess,
}: JobRowProps) {
  return (
    <div className="animate-enter" style={{ "--i": index } as CSSProperties}>
      <JobListItem
        job={job}
        selectable={selectable}
        selected={selected}
        onSelectedChange={(checked) => onSelectedChange(job.id, checked)}
        onCancel={() => onCancel(job.id)}
        onRetry={() => onRetry(job)}
        onChangeModel={() => onChangeModel(job)}
        onGrantAccess={() => onGrantAccess(job)}
        busy={busy}
      />
    </div>
  );
});

export function JobList({
  jobs,
  selectable = false,
  selectedIds,
  onSelectedChange,
  onCancel,
  onRetry,
  onChangeModel,
  onGrantAccess,
  busyId,
}: JobListProps) {
  const sortedJobs = useMemo(
    () =>
      [...jobs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [jobs],
  );
  const select = useStableCallback((id: string, checked: boolean) =>
    onSelectedChange?.(id, checked),
  );
  const cancel = useStableCallback((id: string) => onCancel?.(id));
  const retry = useStableCallback((job: Job) => onRetry?.(job));
  const changeModel = useStableCallback((job: Job) => onChangeModel?.(job));
  const grantAccess = useStableCallback((job: Job) => onGrantAccess?.(job));

  return (
    <div className="space-y-4">
      {sortedJobs.map((job, index) => (
        <JobRow
          key={job.id}
          job={job}
          index={index}
          selectable={selectable}
          selected={selectedIds?.has(job.id) ?? false}
          busy={busyId === job.id}
          onSelectedChange={select}
          onCancel={cancel}
          onRetry={retry}
          onChangeModel={changeModel}
          onGrantAccess={grantAccess}
        />
      ))}
    </div>
  );
}
