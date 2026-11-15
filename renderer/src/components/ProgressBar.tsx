import { cn } from "#lib/utils";

interface ProgressBarProps {
  /** Quantos itens já foram processados. */
  value: number;
  /** Total de itens; 0 ou menor mostra a barra "indeterminada" (ainda contando). */
  total: number;
  /** Nome acessível da barra (leitores de tela). */
  label: string;
  className?: string;
}

/**
 * Barra de progresso na cor de destaque (`primary`). Sem total conhecido, mostra uma barra
 * indeterminada que desliza (o `prefers-reduced-motion` já é tratado globalmente).
 */
export function ProgressBar({ value, total, label, className }: ProgressBarProps) {
  const known = total > 0;
  const percent = known ? Math.min(100, Math.round((value / total) * 100)) : 0;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={known ? percent : undefined}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn(
          "h-full rounded-full bg-primary transition-[width] duration-200 ease-out",
          !known && "w-1/3 animate-pulse",
        )}
        style={known ? { width: `${percent}%` } : undefined}
      />
    </div>
  );
}
