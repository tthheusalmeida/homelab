import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';

import { HEX_CLIP } from '#lib/hex';
import { cn } from '#lib/utils';

/** Cores do confete: a de destaque e a da marca, mais tons festivos. */
const COLORS = [
  'bg-primary',
  'bg-brand',
  'bg-amber-400',
  'bg-rose-400',
  'bg-emerald-400',
  'bg-violet-400',
  'bg-orange-400',
] as const;

/** Hexágono primeiro: é a forma da marca. */
const SHAPES = [HEX_CLIP, 'rounded-sm', 'rounded-full'] as const;

/**
 * Peças do confete: saem do ponto de origem para todos os lados (o ângulo áureo espalha por igual),
 * abrem e a gravidade traz de volta. Tudo calculado do índice, sem sorteio: o estouro é sempre o mesmo.
 */
const PIECES = Array.from({ length: 56 }, (_, index) => {
  const angle = (index * 137.5 * Math.PI) / 180;
  const reach = 130 + ((index * 53) % 100) * 1.9;
  const size = 9 + ((index * 17) % 4) * 2;
  const spin = 360 + ((index * 41) % 4) * 180;

  return {
    dx: `${Math.round(Math.cos(angle) * reach)}px`,
    // Um pouco mais para cima do que para baixo: estoura antes de a gravidade agir.
    dy: `${Math.round(Math.sin(angle) * reach * 0.9 - 40)}px`,
    fall: `${150 + ((index * 29) % 100) * 2}px`,
    rot: `${index % 2 === 0 ? spin : -spin}deg`,
    size,
    color: COLORS[index % COLORS.length],
    shape: SHAPES[index % SHAPES.length],
  };
});

/**
 * Estouro de confete a partir de um ponto da janela (px), num portal no `body`: nenhuma área
 * rolável corta as peças e a camada não bloqueia cliques.
 */
export function Confetti({ origin }: { origin: { x: number; y: number } }) {
  return createPortal(
    <div
      aria-hidden
      data-testid="confetti"
      className="pointer-events-none fixed inset-0 z-[100] overflow-hidden"
    >
      {PIECES.map((piece, index) => (
        <span
          key={index}
          className={cn('animate-confetti absolute', piece.color, piece.shape)}
          style={
            {
              left: origin.x,
              top: origin.y,
              width: piece.size,
              height: piece.shape === 'rounded-sm' ? piece.size * 0.55 : piece.size,
              '--dx': piece.dx,
              '--dy': piece.dy,
              '--fall': piece.fall,
              '--rot': piece.rot,
              '--i': index,
            } as CSSProperties
          }
        />
      ))}
    </div>,
    document.body,
  );
}
