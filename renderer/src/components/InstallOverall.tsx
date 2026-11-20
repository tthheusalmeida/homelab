import { ProgressBar } from '#components/ProgressBar';
import { ComponentStrings, overallPercent } from '#lib/components-text';
import { formatBytes } from '#lib/format';
import { cn } from '#lib/utils';
import type { ComponentsOverall } from '#shared/contracts/components';

/**
 * Progresso geral da instalação dos componentes (quantos itens, bytes e porcentagem). Um só desenho
 * para o assistente de instalação e para Configurações > Componentes; `className` dá o contorno de
 * quem o usa (ex.: o cartão das Configurações).
 */
export function InstallOverall({
  overall,
  className,
}: {
  overall: ComponentsOverall;
  className?: string;
}) {
  return (
    <div role="status" className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{ComponentStrings.overall(overall.done, overall.total)}</span>

        <span className="font-mono text-xs text-muted-foreground">
          {formatBytes(overall.receivedBytes)} de {formatBytes(overall.totalBytes)} ·{' '}
          {overallPercent(overall)}%
        </span>
      </div>

      <ProgressBar
        value={overall.receivedBytes}
        total={overall.totalBytes}
        label="Progresso da instalação"
      />
    </div>
  );
}
