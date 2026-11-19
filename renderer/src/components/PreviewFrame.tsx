import type { ReactNode } from 'react';

import { ReadingSurface } from '#components/ReadingSurface';
import { useReadingPreferences } from '#hooks/use-appearance';
import { cn } from '#lib/utils';

/**
 * Moldura das pré-visualizações das Configurações (Transcrição e Resumo): a superfície de leitura
 * (fonte, tamanho, zoom e cores da Leitura) com **altura fixa** e o que passar cortado com um
 * esmaecido embaixo, para fonte, tamanho e zoom grandes não esticarem o quadro. Os dois lados
 * seguem "Acompanhamento à direita" da Leitura: `follow` fica à esquerda do texto, ou à direita
 * quando os lados estão trocados.
 */
export function PreviewFrame({
  label,
  follow,
  children,
}: {
  label: string;
  /** O acompanhamento (sumário, linha do tempo); some se não houver. */
  follow?: ReactNode;
  children: ReactNode;
}) {
  const { reading } = useReadingPreferences();

  return (
    <ReadingSurface
      framed={false}
      role="region"
      aria-label={label}
      className="relative h-80 min-w-0 overflow-hidden rounded-lg border bg-background"
    >
      <div
        className={cn(
          'flex h-full min-w-0 gap-4 p-3 font-sans',
          reading.swapSides && 'flex-row-reverse',
        )}
      >
        {follow}

        <div className="reading-column min-w-0 flex-1 overflow-hidden">{children}</div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background to-transparent"
      />
    </ReadingSurface>
  );
}
