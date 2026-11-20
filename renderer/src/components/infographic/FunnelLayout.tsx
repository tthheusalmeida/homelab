import { HighlightedTitle, Kicker, PieceBox } from './common';
import type { LayoutProps } from './types';

/** Funil: etapas do topo à base, cada uma mais estreita, com a explicação e a peça ao lado. */
export function FunnelLayout({ data }: LayoutProps) {
  const { items } = data;
  const step = items.length > 1 ? 54 / (items.length - 1) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="w-24 shrink-0">
          <PieceBox pieceKey={data.piece} slot="section" />
        </div>

        <div className="space-y-1">
          <HighlightedTitle title={data.title} />
        </div>
      </div>

      {data.subtitle && <p className="max-w-[60ch] text-muted-foreground">{data.subtitle}</p>}

      <ol className="space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="grid items-center gap-4 @2xl:grid-cols-[1.15fr_1fr]">
            <div
              className="mx-auto px-4 py-3.5 text-center text-background [clip-path:polygon(0_0,100%_0,calc(100%_-_22px)_100%,22px_100%)]"
              style={{
                width: `${100 - index * step}%`,
                background: `color-mix(in oklab, var(--brand) ${50 + index * (45 / Math.max(items.length - 1, 1))}%, var(--foreground))`,
              }}
            >
              <span className="block font-mono text-[11px] font-medium tracking-widest uppercase">
                {item.title}
              </span>

              {item.tag && (
                <b className="block text-[22px] leading-tight tracking-tight tabular-nums">
                  {item.tag}
                </b>
              )}
            </div>

            <div className="grid grid-cols-[76px_1fr] items-center gap-3">
              <PieceBox pieceKey={item.piece} slot={{ item: index }} />

              <p className="text-sm text-muted-foreground">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
