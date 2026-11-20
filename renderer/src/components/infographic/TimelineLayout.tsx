import { cn } from '#lib/utils';

import { HexNum, HighlightedTitle, Kicker, PieceBox, TagChip } from './common';
import type { LayoutProps } from './types';

/** Linha do tempo: marcos alternando de lado ao longo de uma linha central (uma coluna no estreito). */
export function TimelineLayout({ data }: LayoutProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <HighlightedTitle title={data.title} />

        {data.subtitle && (
          <p className="mx-auto max-w-[60ch] text-muted-foreground">{data.subtitle}</p>
        )}
      </div>

      <ol className="relative flex flex-col gap-4 before:absolute before:inset-y-1.5 before:left-[17px] before:border-l-2 before:border-dashed before:border-border @2xl:before:left-1/2">
        {data.items.map((item, index) => {
          const left = index % 2 === 0;

          return (
            <li
              key={index}
              className="grid grid-cols-[34px_1fr] items-center gap-x-3.5 @2xl:grid-cols-[1fr_34px_1fr]"
            >
              <span className="relative z-10 col-start-1 row-start-1 justify-self-center @2xl:col-start-2">
                <HexNum n="" />
              </span>

              <div
                className={cn(
                  'col-start-2 row-start-1 flex items-center gap-3',
                  left
                    ? '@2xl:col-start-1 @2xl:flex-row-reverse @2xl:text-right'
                    : '@2xl:col-start-3',
                )}
              >
                <PieceBox pieceKey={item.piece} className="w-20 shrink-0" />

                <div className="min-w-0 space-y-1">
                  {item.tag && <TagChip>{item.tag}</TagChip>}

                  <h4 className="font-semibold tracking-tight">{item.title}</h4>

                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
