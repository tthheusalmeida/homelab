import type { TranscriptSegment } from '../back/modules/ai/whisper/whisper.service';

interface RawEntry {
  offsets?: { from?: unknown; to?: unknown };
  timestamps?: { from?: unknown; to?: unknown };
  text?: unknown;
}

/** Lê "HH:MM:SS,mmm" (ou com ponto) e devolve milissegundos; `null` se não for um tempo. */
export function parseClock(value: unknown): number | null {
  if (typeof value !== 'string') {
    return null;
  }
  const match = /^(\d+):(\d{2}):(\d{2})[,.](\d{1,3})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, h, m, s, ms] = match;
  return ((Number(h) * 60 + Number(m)) * 60 + Number(s)) * 1000 + Number(ms.padEnd(3, '0'));
}

function toMs(offset: unknown, clock: unknown): number | null {
  if (typeof offset === 'number' && Number.isFinite(offset) && offset >= 0) {
    return offset;
  }
  return parseClock(clock);
}

/**
 * Converte o JSON do Whisper (`transcription[]` com `offsets` em ms e `timestamps` em texto) em
 * trechos. Trechos sem texto ou sem tempo válido são ignorados; JSON inválido lança erro.
 */
export function parseWhisperJson(json: string): TranscriptSegment[] {
  const data = JSON.parse(json) as { transcription?: unknown };
  if (!Array.isArray(data.transcription)) {
    throw new Error('Whisper JSON sem a lista "transcription".');
  }

  const segments: TranscriptSegment[] = [];
  for (const entry of data.transcription as RawEntry[]) {
    const text = typeof entry.text === 'string' ? entry.text.replace(/\s+/g, ' ').trim() : '';
    const startMs = toMs(entry.offsets?.from, entry.timestamps?.from);
    if (!text || startMs === null) {
      continue;
    }
    const endMs = toMs(entry.offsets?.to, entry.timestamps?.to) ?? startMs;
    segments.push({ startMs, endMs: Math.max(endMs, startMs), text });
  }
  return segments;
}
