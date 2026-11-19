/**
 * Preferências por tipo de documento. Ficam no mesmo nível de `reading` (aparência e Configurações):
 * o que é comum às páginas (fonte, tamanho, zoom, cores, painel lateral) continua em `reading`, e
 * o que só faz sentido para um tipo vive aqui.
 */

/** Transcrições com tempo. */
export interface TranscriptPreferences {
  /** Mostra o começo de cada trecho na barra lateral, ao lado do horário (`false` deixa só o horário). */
  preview: boolean;
  /** Mostra, ao lado do horário de cada trecho, a barra de progresso na linha do tempo do áudio. */
  progress: boolean;
}

/** Resumos. */
export interface SummaryPreferences {
  /** Mostra o sumário dos títulos à esquerda do texto, na página (quando há 2 títulos ou mais). */
  outline: boolean;
}

export const DEFAULT_TRANSCRIPT: TranscriptPreferences = { preview: true, progress: true };
export const DEFAULT_SUMMARY: SummaryPreferences = { outline: true };

const asBoolean = (value: unknown, fallback: boolean): boolean | null =>
  value === undefined ? fallback : typeof value === 'boolean' ? value : null;

/** Aceita só preferências válidas (campos que faltam ficam com o padrão); o resto vira `null`. */
export function parseTranscript(value: unknown): TranscriptPreferences | null {
  const candidate = value as Partial<TranscriptPreferences> | null;

  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }

  const preview = asBoolean(candidate.preview, DEFAULT_TRANSCRIPT.preview);
  const progress = asBoolean(candidate.progress, DEFAULT_TRANSCRIPT.progress);

  return preview === null || progress === null ? null : { preview, progress };
}

export function parseSummary(value: unknown): SummaryPreferences | null {
  const candidate = value as Partial<SummaryPreferences> | null;

  if (typeof candidate !== 'object' || candidate === null) {
    return null;
  }

  const outline = asBoolean(candidate.outline, DEFAULT_SUMMARY.outline);

  return outline === null ? null : { outline };
}
