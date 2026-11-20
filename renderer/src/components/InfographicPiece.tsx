import type { ReactNode } from 'react';

import { INFOGRAPHIC_PIECE_SHAPES, type Shape, type Tone } from '#lib/infographic-pieces';
import { cn } from '#lib/utils';

const PIECES = new Map(INFOGRAPHIC_PIECE_SHAPES.map((piece) => [piece.key, piece]));

/** Classe de cada tom (`B` e `N` são maiúsculos no desenho; as classes não dependem de maiúsculas). */
const TONE_CLASS: Record<Tone, string> = {
  b: 'b',
  B: 'bd',
  s: 's',
  n: 'n',
  N: 'nm',
  d: 'd',
  w: 'w',
};

/** Hexágono suave: o que aparece quando a chave da peça é vazia ou desconhecida. */
const FALLBACK: Shape[] = [['g', [50, 14, 81, 32, 81, 68, 50, 86, 19, 68, 19, 32], 's']];

const f = (n: number) => +n.toFixed(1);

function renderShape(shape: Shape, index: number): ReactNode {
  switch (shape[0]) {
    case 'r':
      return (
        <rect
          key={index}
          className={`ig-f-${TONE_CLASS[shape[5]]}`}
          x={shape[1]}
          y={shape[2]}
          width={shape[3]}
          height={shape[4]}
          rx={shape[6]}
        />
      );
    case 'c':
      return (
        <circle
          key={index}
          className={`ig-f-${TONE_CLASS[shape[4]]}`}
          cx={shape[1]}
          cy={shape[2]}
          r={shape[3]}
        />
      );
    case 'e':
      return (
        <ellipse
          key={index}
          className={`ig-f-${TONE_CLASS[shape[5]]}`}
          cx={shape[1]}
          cy={shape[2]}
          rx={shape[3]}
          ry={shape[4]}
        />
      );
    case 'g':
      return (
        <polygon
          key={index}
          className={`ig-f-${TONE_CLASS[shape[2]]}`}
          points={shape[1].join(' ')}
        />
      );
    case 'a':
      return <path key={index} className={`ig-f-${TONE_CLASS[shape[2]]}`} d={shape[1]} />;
    case 'l':
      return (
        <line
          key={index}
          className={`ig-k ig-s-${TONE_CLASS[shape[5]]}`}
          x1={shape[1]}
          y1={shape[2]}
          x2={shape[3]}
          y2={shape[4]}
          strokeWidth={shape[6]}
        />
      );
    case 'k':
      return (
        <path
          key={index}
          className={`ig-k ig-s-${TONE_CLASS[shape[2]]}`}
          d={shape[1]}
          strokeWidth={shape[3]}
        />
      );
    case 'o':
      return (
        <circle
          key={index}
          className={`ig-k ig-s-${TONE_CLASS[shape[4]]}`}
          cx={shape[1]}
          cy={shape[2]}
          r={shape[3]}
          strokeWidth={shape[5]}
        />
      );
    case 'q':
      return (
        <ellipse
          key={index}
          className={`ig-k ig-s-${TONE_CLASS[shape[5]]}`}
          cx={shape[1]}
          cy={shape[2]}
          rx={shape[3]}
          ry={shape[4]}
          strokeWidth={shape[6]}
        />
      );
    case 'T':
      return (
        <g key={index} transform={`rotate(${shape[1]} ${shape[2]} ${shape[3]})`}>
          {shape[4].map(renderShape)}
        </g>
      );
  }
}

/** Base hexagonal em perspectiva em que as peças ficam (prisma achatado). */
function Pedestal() {
  const R = 32;
  const K = 0.55;
  const h = 7;
  const v = [
    [0, -R * K],
    [0.866 * R, -0.5 * R * K],
    [0.866 * R, 0.5 * R * K],
    [0, R * K],
    [-0.866 * R, 0.5 * R * K],
    [-0.866 * R, -0.5 * R * K],
  ].map(([x, y]) => [50 + x, 74 + y]);
  const points = (list: number[][]) => list.map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
  const down = ([x, y]: number[]) => [x, y + h];

  return (
    <>
      <polygon className="ig-ped-l" points={points([v[4], v[3], down(v[3]), down(v[4])])} />
      <polygon className="ig-ped-r" points={points([v[3], v[2], down(v[2]), down(v[3])])} />
      <polygon className="ig-ped-t" points={points(v)} />
    </>
  );
}

interface InfographicPieceProps {
  /** Chave da peça no banco (ex.: `jogos.controle`); vazia ou desconhecida vira um hexágono. */
  pieceKey: string;
  /** Mostra a base hexagonal (padrão). As peças genéricas já vêm sem ela. */
  pedestal?: boolean;
  /** Recorte do desenho (padrão `0 0 100 100`); `0 -8 100 100` centra as peças sem base. */
  viewBox?: string;
  className?: string;
}

/**
 * Uma peça do banco do infográfico: um objeto reconhecível, desenhado em colmeia com os tons do
 * app (acompanha tema e cor de destaque). O tamanho vem do pai (`w-full`).
 */
export function InfographicPiece({
  pieceKey,
  pedestal = true,
  viewBox = '0 0 100 100',
  className,
}: InfographicPieceProps) {
  const piece = PIECES.get(pieceKey);
  const shapes = piece?.shapes ?? FALLBACK;
  const showPedestal = pedestal && piece !== undefined && piece.ped !== false;

  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={piece?.name ?? 'Ilustração'}
      className={cn('block h-auto w-full', className)}
    >
      {showPedestal && <Pedestal />}
      {shapes.map(renderShape)}
    </svg>
  );
}

/** Quantas peças o banco tem (testes e telas de catálogo). */
export const INFOGRAPHIC_PIECE_COUNT = INFOGRAPHIC_PIECE_SHAPES.length;
