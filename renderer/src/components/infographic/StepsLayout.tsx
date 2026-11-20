import { ArrowRight } from 'lucide-react';

import { cn } from '#lib/utils';

import { HexMark, HighlightedTitle, Kicker, PieceBox } from './common';
import type { LayoutProps } from './types';

const COLUMNS: Record<number, string> = {
  3: '@2xl:grid-cols-3',
  4: '@2xl:grid-cols-4',
  5: '@3xl:grid-cols-5',
};

/** A seta entre as etapas só aparece quando elas estão lado a lado (mesmo ponto de quebra das colunas). */
const ARROW_SHOW: Record<number, string> = { 3: '@2xl:flex', 4: '@2xl:flex', 5: '@3xl:flex' };

/**
 * Guia em passos: capa, etapas lado a lado ligadas por setas e dicas. A seta ocupa exatamente o vão
 * entre duas peças (`-right-10` e `w-10`, o mesmo de `gap-10`) e fica na altura do meio da peça, então
 * fica centralizada na horizontal e na vertical.
 */
export function StepsLayout({ data }: LayoutProps) {
  const { items } = data;

  return (
    <div className="space-y-8">
      <div className={cn('grid items-center gap-5', data.piece && '@2xl:grid-cols-[1.6fr_1fr]')}>
        <div className="space-y-2">
          <HighlightedTitle title={data.title} />

          {data.subtitle && <p className="max-w-[52ch] text-muted-foreground">{data.subtitle}</p>}
        </div>
        {data.piece && (
          <PieceBox pieceKey={data.piece} slot="section" className="mx-auto w-full max-w-44" />
        )}
      </div>

      <ol className={cn('grid gap-10 @lg:grid-cols-2', COLUMNS[items.length])}>
        {items.map((item, index) => (
          <li key={index} className="flex flex-col gap-2">
            <div className="relative">
              <PieceBox pieceKey={item.piece} slot={{ item: index }} />

              {index < items.length - 1 && (
                <span
                  aria-hidden="true"
                  data-step-arrow
                  className={cn(
                    'absolute inset-y-0 -right-10 hidden w-10 items-center justify-center text-brand',
                    ARROW_SHOW[items.length],
                  )}
                >
                  <ArrowRight className="size-6" strokeWidth={3.5} />
                </span>
              )}
            </div>

            <Kicker className="mt-1 text-brand-text">Etapa {index + 1}</Kicker>

            <h4 className="font-semibold tracking-tight">{item.title}</h4>

            <p className="text-sm text-muted-foreground">{item.text}</p>
          </li>
        ))}
      </ol>

      {data.tips && data.tips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {data.tips.map((tip, index) => (
            <li
              key={index}
              className="flex items-center gap-2 rounded-full border bg-background p-2 text-[13px]"
            >
              <HexMark />

              {tip}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
