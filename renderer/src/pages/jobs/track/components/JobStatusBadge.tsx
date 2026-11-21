import { Check, Circle, X } from "lucide-react";

import { Badge } from "../../../../ui/badge";

import { type JobStatus, JobStatusOptions } from "../../types/job.types";
import { HexLoader } from "#components/Hex";
import { cn } from "#lib/utils";

interface JobStatusBadgeProps {
  status: JobStatus;
}

const statusConfig = {
  [JobStatusOptions.PENDING]: {
    label: "Pendente",
    icon: Circle,
  },
  [JobStatusOptions.RUNNING]: {
    label: "Em execução",
    icon: Circle,
  },
  [JobStatusOptions.COMPLETED]: {
    label: "Concluído",
    icon: Check,
    className: "bg-emerald-800 text-emerald-300",
  },
  [JobStatusOptions.FAILED]: {
    label: "Falhou",
    icon: X,
  },
} satisfies Record<
  JobStatus,
  {
    label: string;
    icon: typeof Circle;
    className?: string;
  }
>;

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={status === JobStatusOptions.FAILED ? "destructive" : "secondary"}
      className={cn(config.className, "min-w-24 transition-colors duration-300")}
    >
      {status === JobStatusOptions.RUNNING ? (
        <HexLoader key={status} decorative className="size-3.5 text-current" />
      ) : (
        <Icon key={status} className="animate-enter-scale size-3 stroke-3" />
      )}
      {config.label}
    </Badge>
  );
}
