/** Modos de tema: `system` acompanha o tema do sistema operacional. */
export const THEME_MODES = ['system', 'light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** Cores de destaque disponíveis (paleta do Tailwind). A cor padrão é a do ícone (ciano). */
export const ACCENT_IDS = [
  'cyan',
  'blue',
  'indigo',
  'violet',
  'emerald',
  'rose',
  'orange',
] as const;
export type AccentId = (typeof ACCENT_IDS)[number];

/** Aparência do app (janela principal e Configurações). */
export interface Appearance {
  theme: ThemeMode;
  accent: AccentId;
}

export const DEFAULT_APPEARANCE: Appearance = { theme: 'system', accent: 'cyan' };
