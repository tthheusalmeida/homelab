import { cn } from '#lib/utils';

import { HexMark, Kicker, PieceBox, Txt } from './common';
import type { LayoutProps } from './types';

const TILE = 'flex min-w-0 flex-col gap-1.5 rounded-lg border bg-background p-3.5';

/**
 * Mosaico: um destaque grande com o título e a peça principal, blocos menores (número ou peça), uma
 * lista de verificação e uma frase de destaque.
 */
export function MosaicLayout({ data }: LayoutProps) {
  const { items, tips, note } = data;
  const hasTips = Boolean(tips && tips.length > 0);
  const lastWide = items.length % 2 === 1;

  return (
    <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
      <div
        className={cn(
          TILE,
          'col-span-2 justify-between border-primary/40 bg-primary/10 @2xl:row-span-2',
        )}
      >
        <div className="space-y-1.5">
          <h3 className="text-[clamp(1.5rem,4vw,2.2rem)] leading-[1.05] font-extrabold tracking-tight text-balance">
            <Txt kind="title">{data.title}</Txt>
          </h3>

          {data.subtitle && (
            <p className="text-sm text-muted-foreground">
              <Txt kind="subtitle">{data.subtitle}</Txt>
            </p>
          )}
        </div>

        <PieceBox pieceKey={data.piece} slot="section" className="w-[min(11rem,60%)] self-end" />
      </div>

      {items.map((item, index) => (
        <div
          key={index}
          className={cn(TILE, lastWide && index === items.length - 1 && 'col-span-2')}
        >
          {item.tag ? (
            <span className="text-4xl leading-none font-extrabold tracking-tighter text-brand-text">
              <Txt kind="item.tag" index={index}>
                {item.tag}
              </Txt>
            </span>
          ) : (
            <PieceBox pieceKey={item.piece} slot={{ item: index }} className="w-20" />
          )}

          <h4 className="text-sm font-semibold tracking-tight">
            <Txt kind="item.title" index={index}>
              {item.title}
            </Txt>
          </h4>

          <p className="text-[13px] text-muted-foreground">
            <Txt kind="item.text" index={index}>
              {item.text}
            </Txt>
          </p>
        </div>
      ))}

      {hasTips && (
        <div className={cn(TILE, 'col-span-2', !note && '@2xl:col-span-4')}>
          <Kicker>Checklist</Kicker>

          <ul className="space-y-1.5 text-sm">
            {tips?.map((tip, index) => (
              <li key={index} className="flex items-center gap-2">
                <HexMark />

                <Txt kind="tip" index={index}>
                  {tip}
                </Txt>
              </li>
            ))}
          </ul>
        </div>
      )}

      {note && (
        <div
          className={cn(
            TILE,
            'col-span-2 justify-center border-primary/40 bg-primary/10',
            !hasTips && '@2xl:col-span-4',
          )}
        >
          <p className="text-sm font-medium">
            <Txt kind="note">{note}</Txt>
          </p>
        </div>
      )}
    </div>
  );
}
