import type { CSSProperties } from 'react';

import {
  READING_FONT_SIZE,
  READING_ZOOM,
  type ReadingColorId,
  type ReadingColorName,
  type ReadingFontId,
  type ReadingPreferences,
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

/**
 * Intensidade automática: no tema claro o fundo é bem claro (50) e o texto escuro (900); no escuro
 * é o contrário (fundo 950, texto 100). O usuário só escolhe a cor.
 */
export function readingColor(
  color: ReadingColorId,
  role: 'background' | 'text',
  dark: boolean,
): string | null {
  if (color === 'default') {
    return null;
  }

  const shade = role === 'background' ? (dark ? 950 : 50) : dark ? 100 : 900;

  return READING_SHADES[color][shade];
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

/** Variáveis de CSS e fonte da superfície de leitura (ver `.reading-surface` em `global.css`). */
export function readingStyle(preferences: ReadingPreferences, dark: boolean): CSSProperties {
  const background = readingColor(preferences.background, 'background', dark);
  const text = readingColor(preferences.text, 'text', dark);

  return {
    fontFamily: readingFontFamilies[preferences.font],
    fontSize: fontSizeRem(preferences.fontSize),
    '--reading-zoom': preferences.zoom / 100,
    ...(background ? { '--reading-bg': background } : {}),
    ...(text ? { '--reading-fg': text } : {}),
  } as CSSProperties;
}
