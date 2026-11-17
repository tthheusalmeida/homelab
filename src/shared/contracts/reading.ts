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

/** Intensidades do Tailwind, da mais clara (50) à mais escura (950). */
export const READING_SHADES_LIST = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
export type ReadingShade = (typeof READING_SHADES_LIST)[number];

/** `default` mantém as cores do tema; as demais usam a cor do Tailwind (a intensidade é automática). */
export const READING_COLOR_IDS = ['default', ...READING_COLOR_NAMES] as const;
export type ReadingColorId = (typeof READING_COLOR_IDS)[number];

/** Fundo claro e texto escuro: o ponto de partida de quem escolhe uma cor. */
export const DEFAULT_BACKGROUND_SHADE: ReadingShade = 50;
export const DEFAULT_TEXT_SHADE: ReadingShade = 900;

/** Tamanho do texto em passos de 2 (8 a 32), valendo `size / 16` rem. 16 = 1 rem. */
export const READING_FONT_SIZE = { min: 8, max: 32, step: 2, default: 16 } as const;

/** Zoom da leitura em %, como o de um PDF: aumenta (ou diminui) a letra e a largura da coluna juntas. */
export const READING_ZOOM = { min: 70, max: 200, step: 10, default: 100 } as const;

export interface ReadingPreferences {
  font: ReadingFontId;
  fontSize: number;
  zoom: number;
  background: ReadingColorId;
  backgroundShade: ReadingShade;
  text: ReadingColorId;
  textShade: ReadingShade;
  /** Modo leitura: `true` deixa o painel lateral sempre visível; `false` (padrão) só abre ao passar o mouse na borda. */
  pinSidebar: boolean;
}

export const DEFAULT_READING: ReadingPreferences = {
  font: 'default',
  fontSize: READING_FONT_SIZE.default,
  zoom: READING_ZOOM.default,
  background: 'default',
  backgroundShade: DEFAULT_BACKGROUND_SHADE,
  text: 'default',
  textShade: DEFAULT_TEXT_SHADE,
  pinSidebar: false,
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
export const isReadingShade = (value: unknown): value is ReadingShade =>
  READING_SHADES_LIST.includes(value as ReadingShade);

/**
 * Aceita só preferências válidas; qualquer outra coisa vira `null`. Cópias antigas sem as
 * intensidades (`backgroundShade`, `textShade`) ou sem `pinSidebar` ficam com o padrão.
 */
export function parseReading(value: unknown): ReadingPreferences | null {
  const candidate = value as Partial<ReadingPreferences> | null;

  if (!candidate || typeof candidate !== 'object') {
    return null;
  }

  const reading = {
    ...candidate,
    backgroundShade:
      candidate.backgroundShade === undefined
        ? DEFAULT_BACKGROUND_SHADE
        : candidate.backgroundShade,
    textShade: candidate.textShade === undefined ? DEFAULT_TEXT_SHADE : candidate.textShade,
    pinSidebar:
      candidate.pinSidebar === undefined ? DEFAULT_READING.pinSidebar : candidate.pinSidebar,
  };

  if (
    READING_FONT_IDS.includes(reading.font as ReadingFontId) &&
    isReadingFontSize(reading.fontSize) &&
    isReadingZoom(reading.zoom) &&
    READING_COLOR_IDS.includes(reading.background as ReadingColorId) &&
    READING_COLOR_IDS.includes(reading.text as ReadingColorId) &&
    isReadingShade(reading.backgroundShade) &&
    isReadingShade(reading.textShade) &&
    typeof reading.pinSidebar === 'boolean'
  ) {
    return reading as ReadingPreferences;
  }

  return null;
}
