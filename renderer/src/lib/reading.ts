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
  rose: 'Rosé',
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

/**
 * Tamanho final da letra: o tamanho escolhido vezes o zoom, como num PDF (a coluna cresce junto,
 * ver `.reading-column`). Arredondado para não gerar casas decimais longas.
 */
export const zoomedFontSizeRem = (size: number, zoom: number) =>
  `${Math.round(((size * zoom) / 1600) * 10000) / 10000}rem`;

/** Tinta escura e clara para escrever sobre o fundo escolhido (neutras, sem tom de cor). */
const DARK_INK = 'oklch(0.22 0 0)';
const LIGHT_INK = 'oklch(0.97 0 0)';

/** Se a cor (`oklch(L% ...)`) é clara o bastante para pedir tinta escura por cima. */
export function isLightColor(color: string): boolean {
  const lightness = Number.parseFloat(color.replace(/^oklch\(/, ''));

  return lightness / 100 >= 0.6;
}

/** A tinta que se lê sobre esse fundo: escura em fundo claro e clara em fundo escuro. */
export const inkOn = (background: string) => (isLightColor(background) ? DARK_INK : LIGHT_INK);

/**
 * Variáveis de CSS e fonte da superfície de leitura (ver `.reading-surface` em `global.css`).
 * Com fundo escolhido, o contraste vem **do fundo atual, não do tema**: o texto "padrão" vira a
 * tinta legível sobre ele e a aba do painel lateral fica invertida (tinta como fundo da aba e o
 * fundo como cor do ícone).
 */
export function readingStyle(preferences: ReadingPreferences): CSSProperties {
  const background = readingColor(preferences.background, preferences.backgroundShade);
  const ink = background ? inkOn(background) : null;
  const text = readingColor(preferences.text, preferences.textShade) ?? ink;
  const separator = readingColor(preferences.separator, preferences.separatorShade);

  return {
    fontFamily: readingFontFamilies[preferences.font],
    fontSize: zoomedFontSizeRem(preferences.fontSize, preferences.zoom),
    '--reading-zoom': preferences.zoom / 100,
    ...(background ? { '--reading-bg': background } : {}),
    ...(text ? { '--reading-fg': text } : {}),
    ...(separator ? { '--reading-sep': separator } : {}),
    ...(background && ink
      ? {
          '--reading-tab-bg': ink,
          '--reading-tab-fg': background,
          // Controles nativos (campos, rolagem) no esquema do fundo escolhido, não do tema.
          colorScheme: isLightColor(background) ? 'light' : 'dark',
        }
      : {}),
  } as CSSProperties;
}
