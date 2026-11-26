import { useLayoutEffect, useRef, useState } from 'react';

import { hexPath } from '#components/Hex';
import { cn } from '#lib/utils';

interface ProgressBarProps {
  /** Quantos itens já foram processados. */
  value: number;
  /** Total de itens; 0 ou menor = ainda não se sabe o total: a colmeia fica vazia, em 0%. */
  total: number;
  /** Nome acessível do progresso (leitores de tela). */
  label: string;
  /** Completo, a colmeia pulsa em onda (padrão). Passe `false` quando o processo todo acabou: nada mais se move. */
  pulse?: boolean;
  /** A onda também corre nos hexágonos já cheios enquanto a barra enche (etapa em andamento), não só completa. */
  pulseWhileFilling?: boolean;
  className?: string;
}

/** Porcentagem inteira de 0 a 100; sem total conhecido (ou valor negativo), 0. */
export function progressPercent(value: number, total: number): number {
  if (!(total > 0) || !(value > 0)) {
    return 0;
  }

  return Math.min(100, Math.round((value / total) * 100));
}

/**
 * Quantos hexágonos ficam cheios para a porcentagem. Só enche tudo em 100%: antes disso a última
 * célula espera, e qualquer progresso real já acende a primeira (nunca parece parado).
 */
export function filledCells(percent: number, cells: number): number {
  if (percent <= 0) {
    return 0;
  }

  if (percent >= 100) {
    return cells;
  }

  return Math.min(cells - 1, Math.max(1, Math.round((percent / 100) * cells)));
}

/** Hexágonos de cada fileira numa colmeia estreita (o mínimo; em contêiner largo a fileira cresce). */
export const MIN_CELLS_PER_ROW = 20;

const RADIUS = 10;
const CELL_WIDTH = 1.732 * RADIUS;
const GAP = 2;
/** Deslocamento de uma célula para a vizinha: meia largura na horizontal, e a fileira de cima/baixo na vertical. */
const STEP_X = (CELL_WIDTH + GAP) / 2;
const STEP_Y = 1.5 * RADIUS + GAP * 0.866;
const HEIGHT = 2 * RADIUS + STEP_Y;

/**
 * Tamanho de cada hexágono na tela: o de uma colmeia de 20 por fileira em 144px (a do pipeline do
 * acompanhamento). É fixo: a barra mais larga ganha **mais** hexágonos, nunca hexágonos maiores.
 */
const PX_PER_UNIT = 144 / ((2 * MIN_CELLS_PER_ROW - 1) * STEP_X + CELL_WIDTH);

/** Hexágonos por fileira que cabem na largura (px), no tamanho fixo; nunca menos que o mínimo. */
export function cellsPerRowFor(widthPx: number): number {
  if (!(widthPx > 0)) {
    return MIN_CELLS_PER_ROW;
  }

  const cells = Math.floor((widthPx / PX_PER_UNIT - CELL_WIDTH) / STEP_X) + 1;

  return Math.max(MIN_CELLS_PER_ROW, Math.floor(cells / 2));
}

/**
 * O progresso do app (único: carregamento de arquivo, jobs, instalação, backup, atualização): uma
 * colmeia de duas fileiras de hexágonos pequenos, a "água de hexágonos" do site. O hexágono tem
 * tamanho fixo e a quantidade acompanha a largura (20 por fileira no pipeline, mais onde há espaço).
 * É sempre **determinado** e **começa vazio**: enquanto o total não é conhecido, ou nada foi feito,
 * todos os hexágonos ficam vazios, nunca uma faixa parcial no lugar. Cada hexágono "salta" ao ser
 * preenchido (só se encheu com a barra na tela: o que já estava cheio ao aparecer fica parado); o da
 * frente respira enquanto há trabalho; completa, a colmeia inteira pulsa em onda (a menos que
 * `pulse` seja `false`; as animações vivem em `global.css`). Em neon da marca (`brand`), com contorno.
 * Ocupa a largura do contêiner: limite-a com `w-*` ou `max-w-*`.
 */
export function ProgressBar({
  value,
  total,
  label,
  pulse = true,
  pulseWhileFilling = false,
  className,
}: ProgressBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [perRow, setPerRow] = useState(MIN_CELLS_PER_ROW);
  const percent = progressPercent(value, total);
  const cells = perRow * 2;
  const filled = filledCells(percent, cells);
  const complete = percent >= 100;
  // O que já estava cheio quando a barra apareceu não anima; só o que enche depois, com ela na tela.
  const initialPercent = useRef(percent);
  const initialFilled = filledCells(initialPercent.current, cells);
  const width = (cells - 1) * STEP_X + CELL_WIDTH;

  useLayoutEffect(() => {
    const element = rootRef.current;

    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setPerRow(cellsPerRowFor(entry.contentRect.width));
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      data-complete={complete}
      data-pulse={pulse && (complete || pulseWhileFilling)}
      className={cn('w-full', className)}
    >
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} aria-hidden="true" className="block w-full">
        {Array.from({ length: cells }, (_, index) => (
          <path
            key={index}
            d={hexPath(CELL_WIDTH / 2 + index * STEP_X, RADIUS + (index % 2) * STEP_Y, RADIUS)}
            className="hp-cell"
            data-filled={index < filled}
            data-still={index < initialFilled}
            data-frontier={index === filled && percent > 0 && !complete}
            style={{ ['--k' as string]: index }}
          />
        ))}
      </svg>
    </div>
  );
}
