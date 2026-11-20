import { useId, useMemo, type ReactNode } from 'react';

import { facetsOf, seedOf } from '#lib/infographic-facets';
import { INFOGRAPHIC_PIECE_SHAPES, type Shape } from '#lib/infographic-pieces';
import { cn } from '#lib/utils';

const PIECES = new Map(INFOGRAPHIC_PIECE_SHAPES.map((piece) => [piece.key, piece]));

/** Hexágono suave: o que aparece quando a chave da peça é vazia ou desconhecida. */
const FALLBACK: Shape[] = [['g', [50, 14, 81, 32, 81, 68, 50, 86, 19, 68, 19, 32], 's']];
const FALLBACK_BOX: [number, number, number, number] = [19, 14, 62, 72];

/** Lado maior que a peça ocupa no quadro de 100 (sobra margem para o contorno e a sombra). */
const PIECE_SIZE = 76;
const MIN_SCALE = 0.6;
const MAX_SCALE = 1.3;

/** Espessura extra do contorno de adesivo (em unidades do desenho), somada à de cada traço. */
const EDGE = 7;

/** Como cada forma é desenhada: com a cor do tom, só o contorno branco ou só o recorte das facetas. */
type Mode = 'fill' | 'edge' | 'clip';

const rotate = (rot: readonly [number, number, number] | undefined) =>
  rot ? `rotate(${rot[0]} ${rot[1]} ${rot[2]})` : undefined;

function renderShape(
  shape: Shape,
  index: number,
  mode: Mode,
  rot?: readonly [number, number, number],
): ReactNode {
  const transform = mode === 'clip' ? rotate(rot) : undefined;
  const fill = (tone: string) => (mode === 'edge' ? 'ig-edge' : `ig-f-${tone}`);
  const line = (tone: string) => (mode === 'edge' ? 'ig-edgek' : `ig-k ig-s-${tone}`);
  const width = (value: number) => (mode === 'edge' ? value + EDGE : value);
  /** No recorte só entram as partes preenchidas (menos os brilhos claros). */
  const clipped = (tone: string) => mode !== 'clip' || tone !== 'w';

  switch (shape[0]) {
    case 'r':
      return (
        clipped(shape[5]) && (
          <rect
            key={index}
            className={mode === 'clip' ? undefined : fill(shape[5])}
            transform={transform}
            x={shape[1]}
            y={shape[2]}
            width={shape[3]}
            height={shape[4]}
            rx={shape[6]}
          />
        )
      );
    case 'c':
      return (
        clipped(shape[4]) && (
          <circle
            key={index}
            className={mode === 'clip' ? undefined : fill(shape[4])}
            transform={transform}
            cx={shape[1]}
            cy={shape[2]}
            r={shape[3]}
          />
        )
      );
    case 'e':
      return (
        clipped(shape[5]) && (
          <ellipse
            key={index}
            className={mode === 'clip' ? undefined : fill(shape[5])}
            transform={transform}
            cx={shape[1]}
            cy={shape[2]}
            rx={shape[3]}
            ry={shape[4]}
          />
        )
      );
    case 'g':
      return (
        clipped(shape[2]) && (
          <polygon
            key={index}
            className={mode === 'clip' ? undefined : fill(shape[2])}
            transform={transform}
            points={shape[1].join(' ')}
          />
        )
      );
    case 'a':
      return (
        clipped(shape[2]) && (
          <path
            key={index}
            className={mode === 'clip' ? undefined : fill(shape[2])}
            transform={transform}
            d={shape[1]}
          />
        )
      );
    case 'l':
      return (
        mode !== 'clip' && (
          <line
            key={index}
            className={line(shape[5])}
            x1={shape[1]}
            y1={shape[2]}
            x2={shape[3]}
            y2={shape[4]}
            strokeWidth={width(shape[6])}
          />
        )
      );
    case 'k':
      return (
        mode !== 'clip' && (
          <path key={index} className={line(shape[2])} d={shape[1]} strokeWidth={width(shape[3])} />
        )
      );
    case 'o':
      return (
        mode !== 'clip' && (
          <circle
            key={index}
            className={line(shape[4])}
            cx={shape[1]}
            cy={shape[2]}
            r={shape[3]}
            strokeWidth={width(shape[5])}
          />
        )
      );
    case 'q':
      return (
        mode !== 'clip' && (
          <ellipse
            key={index}
            className={line(shape[5])}
            cx={shape[1]}
            cy={shape[2]}
            rx={shape[3]}
            ry={shape[4]}
            strokeWidth={width(shape[6])}
          />
        )
      );
    case 'T': {
      const rotation: [number, number, number] = [shape[1], shape[2], shape[3]];

      // dentro do recorte não pode haver grupo: a rotação vai em cada forma
      if (mode === 'clip') {
        return shape[4].map((child, childIndex) => renderShape(child, childIndex, mode, rotation));
      }

      return (
        <g key={index} transform={rotate(rotation)}>
          {shape[4].map((child, childIndex) => renderShape(child, childIndex, mode))}
        </g>
      );
    }
  }
}

const f = (n: number) => +n.toFixed(3);

/** Escala e deslocamento que centralizam a caixa da peça no quadro. */
export function pieceFit(box: readonly [number, number, number, number]) {
  const [x, y, w, h] = box;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, PIECE_SIZE / Math.max(w, h, 1)));

  return { scale, x: 50 - scale * (x + w / 2), y: 50 - scale * (y + h / 2) };
}

interface InfographicPieceProps {
  /** Chave da peça no banco (ex.: `jogos.controle`); vazia ou desconhecida vira um hexágono. */
  pieceKey: string;
  className?: string;
}

/**
 * Uma peça do banco do infográfico no estilo **papel facetado**: as cores do app (destaque e
 * neutros), facetas claras e escuras por cima, contorno de adesivo e sombra suave. Acompanha tema e
 * cor de destaque. O tamanho vem do pai (`w-full`).
 */
export function InfographicPiece({ pieceKey, className }: InfographicPieceProps) {
  const piece = PIECES.get(pieceKey);
  const shapes = piece?.shapes ?? FALLBACK;
  const fit = pieceFit(piece?.box ?? FALLBACK_BOX);
  const id = `ig-${useId().replace(/:/g, '')}`;
  const facets = useMemo(() => facetsOf(seedOf(pieceKey || 'vazia')), [pieceKey]);

  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label={piece?.name ?? 'Ilustração'}
      data-piece={pieceKey || undefined}
      className={cn('ig-piece block h-auto w-full overflow-visible', className)}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          {shapes.map((shape, index) => renderShape(shape, index, 'clip'))}
        </clipPath>
      </defs>

      <g transform={`translate(${f(fit.x)} ${f(fit.y)}) scale(${f(fit.scale)})`}>
        <g className="ig-edges">
          {shapes.map((shape, index) => renderShape(shape, index, 'edge'))}
        </g>

        {shapes.map((shape, index) => renderShape(shape, index, 'fill'))}

        <g clipPath={`url(#${id}-clip)`}>
          {facets.map((facet, index) => (
            <polygon
              key={index}
              points={facet.points}
              fill={facet.light ? '#fff' : '#000'}
              fillOpacity={facet.opacity}
            />
          ))}
        </g>
      </g>
    </svg>
  );
}

/** Quantas peças o banco tem (testes e telas de catálogo). */
export const INFOGRAPHIC_PIECE_COUNT = INFOGRAPHIC_PIECE_SHAPES.length;
