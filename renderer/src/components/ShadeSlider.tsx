import type { CSSProperties } from 'react';

import { readingShadeSwatch } from '#lib/reading';
import {
  READING_SHADES_LIST,
  type ReadingColorName,
  type ReadingShade,
} from '#shared/contracts/reading';

interface ShadeSliderProps {
  /** Nome para leitores de tela (ex.: "Intensidade: Cor de fundo"). */
  label: string;
  color: ReadingColorName;
  value: ReadingShade;
  onChange: (shade: ReadingShade) => void;
}

/** A faixa da cor em degraus, da intensidade mais clara à mais escura (um degrau por intensidade). */
function bands(color: ReadingColorName): string {
  const step = 100 / READING_SHADES_LIST.length;

  return `linear-gradient(to right, ${READING_SHADES_LIST.map(
    (shade, index) =>
      `${readingShadeSwatch(color, shade)} ${(index * step).toFixed(2)}% ${((index + 1) * step).toFixed(2)}%`,
  ).join(', ')})`;
}

/**
 * Intensidade da cor como um controle deslizante "mais clara ↔ mais escura": a trilha é a própria
 * cor em degraus (50 a 950) e o marcador hexagonal mostra onde está. Todas as intensidades do
 * Tailwind continuam disponíveis; o teclado anda de degrau em degrau.
 */
export function ShadeSlider({ label, color, value, onChange }: ShadeSliderProps) {
  return (
    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
      <span aria-hidden>Clara</span>

      <input
        type="range"
        min={0}
        max={READING_SHADES_LIST.length - 1}
        step={1}
        value={READING_SHADES_LIST.indexOf(value)}
        aria-label={label}
        aria-valuetext={`${value}`}
        className="shade-slider h-5 min-w-0 flex-1"
        style={{ '--shade-bands': bands(color) } as CSSProperties}
        onChange={(event) => onChange(READING_SHADES_LIST[Number(event.target.value)])}
      />

      <span aria-hidden>Escura</span>

      <output aria-hidden className="w-7 text-right font-mono text-xs tabular-nums text-foreground">
        {value}
      </output>
    </div>
  );
}
