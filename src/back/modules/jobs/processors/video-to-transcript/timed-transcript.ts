import type { TranscriptSegment } from '../../../ai/whisper/whisper.service';
import { normalizeText, removeAllegedAuthorship } from '../../../../utils/text';
import { formatTimestamp, TIMESTAMP_PREFIX } from '../../../../../shared/transcript';

/** O formato `[HH:MM:SS]` vive em `shared/transcript` (a tela lê o mesmo padrão). */
export { formatTimestamp, TIMESTAMP_PREFIX };

/** Pausa (ms) entre dois trechos a partir da qual começa um novo parágrafo. */
export const PARAGRAPH_GAP_MS = 2000;
/** Tamanho a partir do qual o parágrafo fecha no próximo fim de frase. */
export const PARAGRAPH_SOFT_LIMIT = 400;
/** Tamanho a partir do qual o parágrafo fecha mesmo sem fim de frase. */
export const PARAGRAPH_HARD_LIMIT = 800;

export interface TimedParagraph {
  startMs: number;
  text: string;
}

const SENTENCE_END = /[.!?…]["')\]]?$/;

/**
 * Agrupa os trechos em parágrafos. Um parágrafo novo começa quando há uma pausa longa, quando o
 * atual já está grande e terminou uma frase, ou quando passou do limite máximo.
 */
export function groupParagraphs(segments: TranscriptSegment[]): TimedParagraph[] {
  const paragraphs: TimedParagraph[] = [];
  let current: TimedParagraph | null = null;
  let previousEnd = 0;

  for (const segment of segments) {
    const text = normalizeText(segment.text);
    if (!text) {
      continue;
    }

    if (current && shouldBreak(current, segment.startMs - previousEnd)) {
      paragraphs.push(current);
      current = null;
    }

    current = current
      ? { startMs: current.startMs, text: `${current.text} ${text}` }
      : { startMs: segment.startMs, text };
    previousEnd = segment.endMs;
  }

  if (current) {
    paragraphs.push(current);
  }
  return paragraphs;
}

function shouldBreak(current: TimedParagraph, gapMs: number): boolean {
  if (gapMs >= PARAGRAPH_GAP_MS) {
    return true;
  }
  if (current.text.length >= PARAGRAPH_HARD_LIMIT) {
    return true;
  }
  return current.text.length >= PARAGRAPH_SOFT_LIMIT && SENTENCE_END.test(current.text);
}

/**
 * Corpo do documento: um parágrafo por bloco, cada um começando com o tempo em que a fala iniciou.
 * Remove a assinatura "Legenda por ..." do último parágrafo; vazio se não houver fala.
 */
export function buildTimedTranscript(segments: TranscriptSegment[]): string {
  const paragraphs = groupParagraphs(segments);
  const last = paragraphs.at(-1);
  if (last) {
    last.text = removeAllegedAuthorship(last.text);
    if (!last.text) {
      paragraphs.pop();
    }
  }
  return paragraphs.map((p) => `${formatTimestamp(p.startMs)} ${p.text}`).join('\n\n');
}
