import { JobStatusOptions, type Job } from "../../types/job.types";

import { ChevronDown, RotateCcw, Timer } from "lucide-react";

import { formatDateTime, formatDuration } from "#lib/format";
import { cn } from "#lib/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#ui/collapsible";
import { Badge } from "#ui/badge";
import { Button } from "#ui/button";
import { Card, CardContent, CardHeader } from "#ui/card";

import { isActiveJob } from "../active";
import { TrackStrings } from "../strings";

import { JobPipeline } from "./JobPipeline";
import { JobLiveProgress } from "./JobLiveProgress";
import { JobStatusBadge } from "./JobStatusBadge";

/** Faixa lateral que mostra o estado do job de relance, como a luz de um servidor. */
const ACCENTS: Record<string, string> = {
  [JobStatusOptions.PENDING]: "border-l-muted-foreground",
  [JobStatusOptions.RUNNING]: "border-l-primary",
  [JobStatusOptions.COMPLETED]: "border-l-emerald-500",
  [JobStatusOptions.FAILED]: "border-l-red-500",
};

interface JobListItemProps {
  job: Job;
  /** Mostra a caixa de seleção (modo de seleção para excluir). */
  selectable?: boolean;
  selected?: boolean;
  onSelectedChange?: (checked: boolean) => void;
  onCancel?: () => void;
  onRetry?: () => void;
  /** Há uma ação (cancelar ou tentar de novo) em andamento neste job. */
  busy?: boolean;
}

export function JobListItem({
  job,
  selectable = false,
  selected = false,
  onSelectedChange,
  onCancel,
  onRetry,
  busy = false,
}: JobListItemProps) {
  const active = isActiveJob(job);
  const accent = ACCENTS[job.status] ?? "border-l-border";

  const duration =
    job.startedAt && job.completedAt
      ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
      : null;

  return (
    <Collapsible className="group">
      <Card
        data-accent={job.status}
        className={cn(
          "border-l-4 transition-[box-shadow,border-color,background-color] duration-200 hover:ring-3 hover:ring-primary/15",
          accent,
        )}
      >
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            {selectable && (
              <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
                aria-label={TrackStrings.selectJob(job.label, job.id)}
                title={active ? TrackStrings.activeCannotBeDeleted : undefined}
                checked={selected}
                disabled={active}
                onChange={(event) => onSelectedChange?.(event.target.checked)}
              />
            )}

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-sm font-semibold">{job.label}</p>

                {duration !== null && (
                  <Badge
                    variant="secondary"
                    className="shrink-0 gap-1 animate-in fade-in-0 slide-in-from-left-2 duration-400"
                  >
                    <Timer className="size-3.5" />
                    {formatDuration(duration)}
                  </Badge>
                )}
              </div>

              <p className="mt-1 truncate font-mono text-xs text-muted-foreground/70">
                {job.id}
              </p>

              {active && (
                <div className="mt-1">
                  <JobLiveProgress job={job} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {active && !job.cancelRequested && (
                <Button size="sm" variant="outline" disabled={busy} onClick={onCancel}>
                  {TrackStrings.cancel}
                </Button>
              )}

              {job.retryable && (
                <Button size="sm" variant="outline" disabled={busy} onClick={onRetry}>
                  <RotateCcw />
                  {TrackStrings.retry}
                </Button>
              )}

              <div className="flex flex-col items-end gap-1">
                <JobStatusBadge status={job.status} />

                <p className="text-xs text-muted-foreground">
                  Criado em {formatDateTime(job.createdAt)}
                </p>
              </div>

              <CollapsibleTrigger className="rounded-md p-2 hover:bg-muted">
                <ChevronDown className="size-4 transition-transform duration-500 ease-in-out group-data-open:rotate-180" />

                <span className="sr-only">Expandir job</span>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            <JobPipeline job={job} />
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
