/** Fontes de leitura: a padrão do app e quatro pensadas para textos longos. */
export const READING_FONT_IDS = [
  'default',
  'literata',
  'merriweather',
  'lora',
  'atkinson',
] as const;
export type ReadingFontId = (typeof READING_FONT_IDS)[number];

/** Cores do Tailwind que podem ser usadas no fundo e no texto da leitura. */
export const READING_COLOR_NAMES = [
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
] as const;
export type ReadingColorName = (typeof READING_COLOR_NAMES)[number];

/** `default` mantém as cores do tema; as demais usam a cor do Tailwind (a intensidade é automática). */
export const READING_COLOR_IDS = ['default', ...READING_COLOR_NAMES] as const;
export type ReadingColorId = (typeof READING_COLOR_IDS)[number];

/** Tamanho do texto em passos de 2 (8 a 32), valendo `size / 16` rem. 16 = 1 rem. */
export const READING_FONT_SIZE = { min: 8, max: 32, step: 2, default: 16 } as const;

/** Largura da coluna de leitura, em % da largura padrão. */
export const READING_ZOOM = { min: 70, max: 200, step: 10, default: 100 } as const;

export interface ReadingPreferences {
  font: ReadingFontId;
  fontSize: number;
  zoom: number;
  background: ReadingColorId;
  text: ReadingColorId;
}

export const DEFAULT_READING: ReadingPreferences = {
  font: 'default',
  fontSize: READING_FONT_SIZE.default,
  zoom: READING_ZOOM.default,
  background: 'default',
  text: 'default',
};

function isStep(
  value: unknown,
  range: { min: number; max: number; step: number },
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= range.min &&
    value <= range.max &&
    (value - range.min) % range.step === 0
  );
}

export const isReadingFontSize = (value: unknown) => isStep(value, READING_FONT_SIZE);
export const isReadingZoom = (value: unknown) => isStep(value, READING_ZOOM);

/** Aceita só preferências completas e válidas; qualquer outra coisa vira `null`. */
export function parseReading(value: unknown): ReadingPreferences | null {
  const candidate = value as Partial<ReadingPreferences> | null;

  if (
    candidate &&
    READING_FONT_IDS.includes(candidate.font as ReadingFontId) &&
    isReadingFontSize(candidate.fontSize) &&
    isReadingZoom(candidate.zoom) &&
    READING_COLOR_IDS.includes(candidate.background as ReadingColorId) &&
    READING_COLOR_IDS.includes(candidate.text as ReadingColorId)
  ) {
    return candidate as ReadingPreferences;
  }

  return null;
}
