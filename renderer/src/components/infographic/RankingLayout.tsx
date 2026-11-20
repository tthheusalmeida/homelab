import { DOT_GRID, HexNum, HighlightedTitle, Kicker, PieceBox, Txt } from './common';
import type { LayoutProps } from './types';

import { cn } from '#lib/utils';

/** Ranking: lista numerada do primeiro ao último, cada item com a peça, o texto e uma barra de medida. */
export function RankingLayout({ data }: LayoutProps) {
  const meterLabel = data.meterLabel ?? 'Medida';

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <HighlightedTitle title={data.title} />

        {data.subtitle && (
          <p className="max-w-[60ch] text-muted-foreground">
            <Txt kind="subtitle">{data.subtitle}</Txt>
          </p>
        )}
      </div>

      <ol className="flex flex-col gap-2.5">
        {data.items.map((item, index) => (
          <li
            key={index}
            className="grid grid-cols-[44px_64px_1fr] items-center gap-3.5 rounded-lg border bg-background py-2.5 pr-3.5 pl-2.5 @lg:grid-cols-[44px_84px_1fr_150px]"
          >
            <HexNum n={index + 1} large />

            <div className={cn('rounded-md', DOT_GRID)}>
              <PieceBox pieceKey={item.piece} slot={{ item: index }} />
            </div>

            <div className="min-w-0">
              <h4 className="font-semibold tracking-tight">
                <Txt kind="item.title" index={index}>
                  {item.title}
                </Txt>
              </h4>

              <p className="text-sm text-muted-foreground">
                <Txt kind="item.text" index={index}>
                  {item.text}
                </Txt>
              </p>
            </div>

            <div className="col-span-3 @lg:col-span-1">
              <Kicker>
                <Txt kind="meterLabel">{meterLabel}</Txt>
              </Kicker>

              <div
                role="meter"
                aria-label={`${meterLabel}: ${item.value ?? 0}%`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={item.value ?? 0}
                className="mt-1 h-2 overflow-hidden rounded bg-muted"
              >
                <i
                  className="block h-full rounded bg-brand"
                  style={{ width: `${item.value ?? 0}%` }}
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
