import type { ReactNode } from "react";

import { CircleAlert, Info, TriangleAlert, type LucideIcon } from "lucide-react";

import { cn } from "#lib/utils";

export type CalloutTone = "info" | "warning" | "danger";

const TONES: Record<CalloutTone, { icon: LucideIcon; box: string; iconColor: string }> = {
  info: {
    icon: Info,
    box: "border-primary/30 bg-primary/10",
    iconColor: "text-primary",
  },
  warning: {
    icon: TriangleAlert,
    box: "border-amber-500/40 bg-amber-500/10",
    iconColor: "text-amber-500",
  },
  danger: {
    icon: CircleAlert,
    box: "border-destructive/40 bg-destructive/10",
    iconColor: "text-destructive",
  },
};

interface CalloutProps {
  tone?: CalloutTone;
  children: ReactNode;
  /** `alert` para erro que interrompe, `status` para aviso que muda com a ação do usuário. */
  role?: "alert" | "status" | "note";
  className?: string;
}

/**
 * Aviso em destaque (faixa colorida com ícone) para o que **muda o comportamento** da tela e que o
 * usuário quase não lê quando vem em texto pequeno e cinza: algo foi desabilitado, ignorado ou
 * limitado. Texto discreto continua para dicas que não mudam nada.
 */
export function Callout({ tone = "info", children, role, className }: CalloutProps) {
  const { icon: Icon, box, iconColor } = TONES[tone];

  return (
    <div
      role={role}
      data-tone={tone}
      className={cn(
        "animate-enter flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium text-foreground",
        box,
        className,
      )}
    >
      <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", iconColor)} />

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
