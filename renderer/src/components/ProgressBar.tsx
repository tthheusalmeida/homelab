import { cn } from '#lib/utils';

interface ProgressBarProps {
  /** Quantos itens já foram processados. */
  value: number;
  /** Total de itens; 0 ou menor = ainda não se sabe o total: a barra fica vazia, em 0%. */
  total: number;
  /** Nome acessível da barra (leitores de tela). */
  label: string;
  className?: string;
}

/** Porcentagem inteira de 0 a 100; sem total conhecido (ou valor negativo), 0. */
export function progressPercent(value: number, total: number): number {
  if (!(total > 0) || !(value > 0)) {
    return 0;
  }

  return Math.min(100, Math.round((value / total) * 100));
}

/**
 * A barra de progresso do app (única: carregamento de arquivo, jobs, instalação, backup, atualização).
 * É sempre **determinada** e **começa vazia**: enquanto o total não é conhecido, ou nada foi feito, ela
 * mostra 0%, nunca uma faixa parcial no lugar. Só avança quando há progresso de verdade. Na cor de
 * destaque (`primary`).
 */
export function ProgressBar({ value, total, label, className }: ProgressBarProps) {
  const percent = progressPercent(value, total);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
