import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

import { HexFrame } from "#components/Hex";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex animate-enter flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-6 py-12 text-center">
      {Icon && (
        <HexFrame className="mb-2">
          <Icon className="size-5" />
        </HexFrame>
      )}

      <p className="text-sm font-semibold">{title}</p>

      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}

      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
