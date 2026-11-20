import { cn } from '#lib/utils';

import { DOT_GRID, HighlightedTitle, Kicker, PieceBox } from './common';
import type { LayoutProps } from './types';

/** Números: destaques grandes, cada um com a sua peça, e uma observação final. */
export function NumbersLayout({ data }: LayoutProps) {
  const { items } = data;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <HighlightedTitle title={data.title} />

        {data.subtitle && <p className="max-w-[60ch] text-muted-foreground">{data.subtitle}</p>}
      </div>

      <ul
        className={cn(
          'grid grid-cols-2 gap-3',
          items.length === 3 ? '@2xl:grid-cols-3' : '@2xl:grid-cols-4',
        )}
      >
        {items.map((item, index) => (
          <li
            key={index}
            className="flex flex-col gap-1.5 rounded-lg border bg-background p-3 pb-4"
          >
            <div className={cn('rounded-md', DOT_GRID)}>
              <PieceBox pieceKey={item.piece} className="mx-auto w-full max-w-36" />
            </div>

            <span className="text-[clamp(1.75rem,4.4vw,2.5rem)] leading-none font-extrabold tracking-tighter text-brand-text tabular-nums">
              {item.tag}
            </span>

            <span className="text-[13.5px] text-muted-foreground">{item.text}</span>
          </li>
        ))}
      </ul>

      {data.note && (
        <div className="grid items-center gap-4 rounded-lg border bg-background p-3 @lg:grid-cols-[96px_1fr]">
          <PieceBox pieceKey={data.piece} className="mx-auto w-24" />

          <p className="text-sm">{data.note}</p>
        </div>
      )}
    </div>
  );
}
