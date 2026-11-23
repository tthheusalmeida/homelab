import { DEFAULT_TRANSCRIPT, type TranscriptPreferences } from './document-views';
import { DEFAULT_READING, type ReadingPreferences } from './reading';

/** Modos de tema: `system` acompanha o tema do sistema operacional. */
export const THEME_MODES = ['system', 'light', 'dark'] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

/** As 15 cores de destaque (paleta do Tailwind), da mais quente à mais fria. A padrão é a do ícone (ciano). */
export const ACCENT_IDS = [
  'pink',
  'rose',
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
] as const;
export type AccentId = (typeof ACCENT_IDS)[number];

/** Aparência do app (janela principal e Configurações). */
export interface Appearance {
  theme: ThemeMode;
  accent: AccentId;
  /** Como o texto aparece nas páginas e nos livros (fonte, tamanho, largura e cores). */
  reading: ReadingPreferences;
  /** Ajustes só das transcrições com tempo (no mesmo nível de `reading`). */
  transcript: TranscriptPreferences;
}

/** Parte da aparência: `reading` e `transcript` também podem vir parciais (só o que mudou). */
export type AppearancePatch = Partial<Omit<Appearance, 'reading' | 'transcript'>> & {
  reading?: Partial<ReadingPreferences>;
  transcript?: Partial<TranscriptPreferences>;
};

export const DEFAULT_APPEARANCE: Appearance = {
  theme: 'system',
  accent: 'cyan',
  reading: DEFAULT_READING,
  transcript: DEFAULT_TRANSCRIPT,
};
