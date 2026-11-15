import type { ReactNode } from 'react';

import { cn } from '#lib/utils';

/** Caminho SVG de um hexágono de pontas para cima, centrado em (cx, cy) com raio r. */
export function hexPath(cx: number, cy: number, r: number): string {
  const points = [
    [0, -r],
    [0.866 * r, -r / 2],
    [0.866 * r, r / 2],
    [0, r],
    [-0.866 * r, r / 2],
    [-0.866 * r, -r / 2],
  ];

  return (
    'M' + points.map(([x, y]) => `${(cx + x).toFixed(2)} ${(cy + y).toFixed(2)}`).join('L') + 'Z'
  );
}

/** Os três hexágonos do ícone (um em cima, dois embaixo), no quadro 48 x 48. */
const CLUSTER = [
  { cx: 24, cy: 15.5 },
  { cx: 31.4, cy: 28.4 },
  { cx: 16.6, cy: 28.4 },
] as const;

interface HexMarkProps {
  className?: string;
  /** Classe de preenchimento de cada hexágono (cima, baixo-direita, baixo-esquerda). */
  fills?: readonly [string, string, string];
}

function HexCluster({ className, fills }: Required<HexMarkProps>) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      {CLUSTER.map(({ cx, cy }, index) => (
        <path key={index} d={hexPath(cx, cy, 6.6)} className={cn('hex-cell', fills[index])} />
      ))}
    </svg>
  );
}

/** Logo do HomeLab: dois hexágonos neutros e um na cor de destaque. */
export function Logo({ className }: { className?: string }) {
  return (
    <HexCluster
      className={cn('size-6 shrink-0', className)}
      fills={['fill-foreground', 'fill-foreground', 'fill-brand']}
    />
  );
}

/** Carregando: os três hexágonos acendem em sequência, na cor de destaque. */
export function HexLoader({
  className,
  label = 'Carregando',
}: {
  className?: string;
  label?: string;
}) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('inline-flex size-8 shrink-0 text-brand', className)}
    >
      <HexCluster className="size-full" fills={['fill-current', 'fill-current', 'fill-current']} />
    </span>
  );
}

/** Ponto de status em forma de hexágono (a cor vem de `className`, ex.: `bg-emerald-500`). */
export function HexDot({ className, pulse = false }: { className?: string; pulse?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block h-[0.7rem] w-[0.62rem] shrink-0 [clip-path:polygon(50%_0,100%_25%,100%_75%,50%_100%,0_75%,0_25%)]',
        pulse && 'animate-pulse',
        className,
      )}
    />
  );
}

/** Moldura hexagonal para o ícone de estados vazios e de erro. */
export function HexFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative flex size-12 items-center justify-center text-brand', className)}>
      <svg viewBox="0 0 48 48" aria-hidden="true" className="absolute inset-0 size-full">
        <path
          d={hexPath(24, 24, 21)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      <span className="relative flex items-center justify-center">{children}</span>
    </div>
  );
}

const HONEYCOMB_CENTERS = [
  [60, 40],
  [132, 40],
  [204, 40],
  [276, 40],
  [96, 102],
  [168, 102],
  [240, 102],
  [312, 102],
  [60, 164],
  [132, 164],
  [204, 164],
  [276, 164],
] as const;

/** Colmeia decorativa e discreta (cor de destaque a 7%), para cantos de páginas e estados vazios. */
export function HoneycombBackdrop({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 380 260"
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute -top-4 -right-8 h-[16rem] w-[24rem] text-brand opacity-[0.07]',
        className,
      )}
    >
      {HONEYCOMB_CENTERS.map(([cx, cy]) => (
        <path
          key={`${cx}-${cy}`}
          d={hexPath(cx, cy, 32)}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
