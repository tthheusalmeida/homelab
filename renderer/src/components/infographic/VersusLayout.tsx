import { cn } from '#lib/utils';

import { HexMark, HexNum, HighlightedTitle, Kicker, PieceBox } from './common';
import type { LayoutProps } from './types';

function Side({ piece, title, label }: { piece: string; title: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <PieceBox pieceKey={piece} className="w-28" />

      <div className="space-y-0.5">
        <Kicker>{label}</Kicker>

        <h4 className="text-lg font-semibold tracking-tight">{title}</h4>
      </div>
    </div>
  );
}

/**
 * Comparativo: dois lados, cada um centrado com a sua peça, e os critérios em linhas (o lado que
 * leva o critério ganha destaque e a marca de confirmação).
 */
export function VersusLayout({ data }: LayoutProps) {
  const [a, b] = data.sides ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <HighlightedTitle title={data.title} />

        {data.subtitle && (
          <p className="mx-auto max-w-[60ch] text-muted-foreground">{data.subtitle}</p>
        )}
      </div>

      <div className="grid items-center gap-4 @2xl:grid-cols-[1fr_auto_1fr]">
        {a && <Side piece={a.piece} title={a.title} label="Opção A" />}

        <div className="flex justify-center">
          <HexNum n="VS" large />
        </div>

        {b && <Side piece={b.piece} title={b.title} label="Opção B" />}
      </div>

      <div className="space-y-2">
        {data.items.map((item, index) => (
          <div key={index} className="grid gap-1 @2xl:grid-cols-[1fr_8rem_1fr] @2xl:gap-3">
            <Cell win={item.winner === 'a'}>{item.text}</Cell>

            <div className="grid place-items-center text-center font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase @max-2xl:order-first @max-2xl:place-items-start @max-2xl:pt-2">
              {item.title}
            </div>

            <Cell win={item.winner === 'b'}>{item.extra}</Cell>
          </div>
        ))}
      </div>
    </div>
  );
}

function Cell({ win, children }: { win: boolean; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border bg-background px-3 py-2.5 text-sm',
        win && 'border-primary bg-primary/10',
      )}
    >
      {win && <HexMark />}

      <span>{children}</span>
    </div>
  );
}
