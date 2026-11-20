import { cn } from '#lib/utils';

import { HexMark, HighlightedTitle, Kicker, PieceBox } from './common';
import type { LayoutProps } from './types';

const COLUMNS: Record<number, string> = {
  3: '@2xl:grid-cols-3',
  4: '@2xl:grid-cols-4',
  5: '@3xl:grid-cols-5',
};

/** A seta entre as etapas só aparece quando elas estão lado a lado (mesmo ponto de quebra das colunas). */
const ARROW_SHOW: Record<number, string> = { 3: '@2xl:grid', 4: '@2xl:grid', 5: '@3xl:grid' };

/** Guia em passos: capa, etapas lado a lado ligadas por setas hexagonais e dicas. */
export function StepsLayout({ data }: LayoutProps) {
  const { items } = data;

  return (
    <div className="space-y-8">
      <div className={cn('grid items-center gap-5', data.piece && '@2xl:grid-cols-[1.6fr_1fr]')}>
        <div className="space-y-2">
          <HighlightedTitle title={data.title} />

          {data.subtitle && <p className="max-w-[52ch] text-muted-foreground">{data.subtitle}</p>}
        </div>
        {data.piece && <PieceBox pieceKey={data.piece} className="mx-auto w-full max-w-44" />}
      </div>

      <ol className={cn('grid gap-10 @lg:grid-cols-2', COLUMNS[items.length])}>
        {items.map((item, index) => (
          <li key={index} className="relative flex flex-col gap-2">
            <PieceBox pieceKey={item.piece} />

            <Kicker className="mt-1 text-brand-text">Etapa {index + 1}</Kicker>

            <h4 className="font-semibold tracking-tight">{item.title}</h4>

            <p className="text-sm text-muted-foreground">{item.text}</p>

            {index < items.length - 1 && (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-9 -right-8 hidden h-[29px] w-6 place-items-center bg-brand text-xs font-bold text-background [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]',
                  ARROW_SHOW[items.length],
                )}
              >
                →
              </span>
            )}
          </li>
        ))}
      </ol>

      {data.tips && data.tips.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {data.tips.map((tip, index) => (
            <li
              key={index}
              className="flex items-center gap-2 rounded-full border bg-background py-1.5 pr-4 pl-2 text-[13px]"
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
