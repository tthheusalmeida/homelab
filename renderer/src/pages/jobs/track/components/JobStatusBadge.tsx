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

/**
 * Recorte hexagonal "deitado" (pontas na esquerda e na direita) para uma etiqueta com texto: o
 * hexágono da marca esticado para caber o ícone e o nome do estado dentro.
 */
const HEX_TAG_CLIP =
  "[clip-path:polygon(0.6rem_0,calc(100%-0.6rem)_0,100%_50%,calc(100%-0.6rem)_100%,0.6rem_100%,0_50%)]";

/**
 * Estado do job, dentro de um hexágono. As cores de cada estado são as de sempre (concluído em verde,
 * falha em vermelho, os demais no tom neutro); em execução, o `HexLoader`.
 */
export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={status === JobStatusOptions.FAILED ? "destructive" : "secondary"}
      className={cn(
        config.className,
        "h-6 min-w-28 rounded-none px-4 transition-colors duration-300",
        HEX_TAG_CLIP,
      )}
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
