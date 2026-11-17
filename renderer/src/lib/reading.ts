import type { CSSProperties } from 'react';

import {
  READING_FONT_SIZE,
  READING_ZOOM,
  type ReadingColorId,
  type ReadingColorName,
  type ReadingFontId,
  type ReadingPreferences,
  type ReadingShade,
} from '#shared/contracts/reading';

import { READING_SHADES } from './reading-shades';

export const readingFontLabels: Record<ReadingFontId, string> = {
  default: 'Padrão',
  literata: 'Literata',
  merriweather: 'Merriweather',
  lora: 'Lora',
  atkinson: 'Atkinson',
};

/** Dica curta de cada fonte, mostrada no seletor. */
export const readingFontHints: Record<ReadingFontId, string> = {
  default: 'A fonte do app',
  literata: 'Feita para ler em tela',
  merriweather: 'Serifada, bem aberta',
  lora: 'Serifada, elegante',
  atkinson: 'Letras fáceis de distinguir',
};

/** `font-family` de cada fonte (todas empacotadas no app; ver `global.css`). */
export const readingFontFamilies: Record<ReadingFontId, string> = {
  default: 'var(--font-sans)',
  literata: '"Literata Variable", Georgia, serif',
  merriweather: '"Merriweather Variable", Georgia, serif',
  lora: '"Lora Variable", Georgia, serif',
  atkinson: '"Atkinson Hyperlegible", var(--font-sans)',
};

export const readingColorLabels: Record<ReadingColorId, string> = {
  default: 'Padrão',
  red: 'Vermelho',
  orange: 'Laranja',
  amber: 'Âmbar',
  yellow: 'Amarelo',
  lime: 'Lima',
  green: 'Verde',
  emerald: 'Esmeralda',
  teal: 'Azul-petróleo',
  cyan: 'Ciano',
  sky: 'Céu',
  blue: 'Azul',
  indigo: 'Índigo',
  violet: 'Violeta',
  purple: 'Roxo',
  fuchsia: 'Fúcsia',
  pink: 'Rosa',
  rose: 'Rosé',
  slate: 'Ardósia',
  gray: 'Cinza',
  zinc: 'Zinco',
  neutral: 'Neutro',
  stone: 'Pedra',
};

/** Amostra da cor no seletor (o tom 500, que lê bem nos dois temas). */
export function readingSwatch(color: ReadingColorName): string {
  return READING_SHADES[color][500];
}

/** Uma intensidade de uma cor (amostra do seletor de intensidade). */
export function readingShadeSwatch(color: ReadingColorName, shade: ReadingShade): string {
  return READING_SHADES[color][shade];
}

/** A cor escolhida na intensidade escolhida, ou `null` para manter a do tema. */
export function readingColor(color: ReadingColorId, shade: ReadingShade): string | null {
  return color === 'default' ? null : READING_SHADES[color][shade];
}

/** Sobe ou desce um passo, sem sair dos limites. */
function step(
  value: number,
  direction: 1 | -1,
  range: { min: number; max: number; step: number },
): number {
  return Math.min(range.max, Math.max(range.min, value + direction * range.step));
}

export const stepFontSize = (value: number, direction: 1 | -1) =>
  step(value, direction, READING_FONT_SIZE);

export const stepZoom = (value: number, direction: 1 | -1) => step(value, direction, READING_ZOOM);

/** Tamanho do texto em rem (16 = 1 rem). */
export const fontSizeRem = (size: number) => `${size / 16}rem`;

/**
 * Tamanho final da letra: o tamanho escolhido vezes o zoom, como num PDF (a coluna cresce junto,
 * ver `.reading-column`). Arredondado para não gerar casas decimais longas.
 */
export const zoomedFontSizeRem = (size: number, zoom: number) =>
  `${Math.round(((size * zoom) / 1600) * 10000) / 10000}rem`;

/** Variáveis de CSS e fonte da superfície de leitura (ver `.reading-surface` em `global.css`). */
export function readingStyle(preferences: ReadingPreferences): CSSProperties {
  const background = readingColor(preferences.background, preferences.backgroundShade);
  const text = readingColor(preferences.text, preferences.textShade);

  return {
    fontFamily: readingFontFamilies[preferences.font],
    fontSize: zoomedFontSizeRem(preferences.fontSize, preferences.zoom),
    '--reading-zoom': preferences.zoom / 100,
    ...(background ? { '--reading-bg': background } : {}),
    ...(text ? { '--reading-fg': text } : {}),
  } as CSSProperties;
}
