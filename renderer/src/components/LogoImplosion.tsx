import type { Ref } from 'react';

import { CLUSTER, hexPath } from '#components/Hex';
import { cn } from '#lib/utils';

/** Quadro do desenho da logo (48 x 48) e raio de cada hexágono, os mesmos de `Logo`. */
const FRAME = 48;
const HEX_RADIUS = 6.6;

/** Preenchimento de cada hexágono (cima, baixo-direita, baixo-esquerda), como na `Logo`. */
const FILLS = ['fill-foreground', 'fill-foreground', 'fill-brand'] as const;

/**
 * A logo do HomeLab (três hexágonos, um na cor de destaque) numa animação de agradecimento: os
 * hexágonos giram e encolhem como uma galáxia implodindo, viram um ponto (com um clarão) e voltam
 * crescendo e girando até a posição certa. Tudo numa linha do tempo só (`animate-implosion`, ver
 * `global.css`), que termina com a logo normal e parada, então sem animação (ou com "reduzir
 * movimento") ela aparece simplesmente desenhada.
 *
 * O ponto crítico fica no centro do quadro: o `ref`-pai usa o centro desta caixa como origem do
 * confete. Cada hexágono é um elemento próprio, para girar em torno do próprio centro.
 */
export function LogoImplosion({
  className,
  ref,
}: {
  className?: string;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={ref}
      aria-hidden
      data-testid="logo-implosion"
      className={cn('relative size-20 shrink-0', className)}
    >
      {/* Clarão do ponto crítico. */}
      <span
        data-testid="logo-critical"
        className="animate-critical absolute top-1/2 left-1/2 -mt-2 -ml-2 size-4 rounded-full bg-primary shadow-[0_0_28px_8px] shadow-primary/60"
      />

      {/* O conjunto gira em torno do centro, que é também o ponto crítico. */}
      <div data-testid="logo-hexes" className="animate-implosion absolute inset-0">
        {CLUSTER.map(({ cx, cy }, index) => (
          <div
            key={index}
            className="animate-hex-spin absolute inset-0"
            style={{ transformOrigin: `${(cx / FRAME) * 100}% ${(cy / FRAME) * 100}%` }}
          >
            <svg viewBox={`0 0 ${FRAME} ${FRAME}`} className="size-full">
              <path d={hexPath(cx, cy, HEX_RADIUS)} className={cn('hex-cell', FILLS[index])} />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
