import type { ReactNode } from 'react';

import { Check, X } from 'lucide-react';

import { cn } from '#lib/utils';

import { InfographicPiece } from '#components/InfographicPiece';

const HEX = '[clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]';

/** Fundo pontilhado discreto atrás das peças. */
export const DOT_GRID =
  'bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_9%,transparent)_1px,transparent_1.2px)] bg-[length:14px_14px]';

/** Rótulo pequeno em fonte mono (o mesmo dos cabeçalhos do app). */
export function Kicker({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'font-mono text-[11px] font-medium tracking-widest text-muted-foreground uppercase',
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Etiqueta curta (data, valor): com folga dentro, para não ficar colada no texto. */
export function TagChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block w-fit rounded-full bg-primary/10 px-3 py-1 font-mono text-[11px] leading-none font-medium tracking-wider text-brand-text uppercase">
      {children}
    </span>
  );
}

/** Hexágono com número (ordem de leitura). */
export function HexNum({ n, large = false }: { n: ReactNode; large?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid shrink-0 place-items-center bg-brand font-bold text-background',
        HEX,
        large ? 'h-[50px] w-11 text-lg' : 'h-[34px] w-[30px] text-[13px]',
      )}
    >
      {n}
    </span>
  );
}

/** Hexágono de confirmação (verdade, vencedor) ou de negação (mito). */
export function HexMark({ kind = 'ok' }: { kind?: 'ok' | 'bad' }) {
  const Icon = kind === 'ok' ? Check : X;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid h-[22px] w-5 shrink-0 place-items-center text-background',
        HEX,
        kind === 'ok' ? 'bg-brand' : 'bg-destructive',
      )}
    >
      <Icon className="size-3" strokeWidth={3.2} />
    </span>
  );
}

/** Caixa com uma peça dentro (borda, fundo e pontilhado). */
export function PieceBox({
  pieceKey,
  className,
  pedestal = true,
}: {
  pieceKey: string;
  className?: string;
  pedestal?: boolean;
}) {
  return (
    <div className={cn('overflow-hidden rounded-lg border bg-background p-1', DOT_GRID, className)}>
      <InfographicPiece pieceKey={pieceKey} pedestal={pedestal} />
    </div>
  );
}

/** O último termo do título ganha a cor de destaque (o resto fica como está). */
export function HighlightedTitle({
  title,
  className,
  cover = false,
}: {
  title: string;
  className?: string;
  /** O título da capa, maior que o das seções. */
  cover?: boolean;
}) {
  const words = title.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop() : null;

  return (
    <h3
      className={cn(
        'leading-[1.05] font-extrabold tracking-tight text-balance',
        cover ? 'text-[clamp(2rem,6vw,3.4rem)]' : 'text-[clamp(1.25rem,3.2vw,1.9rem)]',
        className,
      )}
    >
      {last ? (
        <>
          {words.join(' ')} <span className="text-brand-text">{last}</span>
        </>
      ) : (
        <span className="text-brand-text">{title}</span>
      )}
    </h3>
  );
}

/** Divisor com o hexágono (o mesmo dos módulos de leitura). */
export function HexRule({ className }: { className?: string }) {
  return (
    <div className={cn('relative my-4 h-px bg-border', className)} aria-hidden="true">
      <span className={cn('absolute -top-[5px] left-0 h-3 w-[11px] bg-brand', HEX)} />
    </div>
  );
}
