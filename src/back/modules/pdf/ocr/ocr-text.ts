import type { OcrLines } from './ocr-engine.port';

/** Palavras com confiança abaixo disto são descartadas (em foto ou arte o motor "lê" lixo). */
export const MIN_WORD_CONFIDENCE = 70;

/** Uma página só vale se sobrarem ao menos tantas palavras com sentido (3 letras ou mais). */
export const MIN_MEANINGFUL_WORDS = 4;

const MEANINGFUL_WORD = /\p{L}{3,}/u;
const HAS_CONTENT = /[\p{L}\p{N}]/u;

export interface OcrPageText {
  /** Linhas já filtradas, prontas para a limpeza comum de texto. Vazio quando a página não vale. */
  lines: string[];
  /** Palavras lidas pelo motor e quantas passaram no filtro. */
  words: number;
  keptWords: number;
  /** Confiança média (0 a 100) das palavras mantidas; 0 sem palavras. */
  confidence: number;
}

/**
 * Transforma o que o motor leu em texto aproveitável: mantém só as palavras em que ele confia e
 * descarta a página inteira se sobrar pouca coisa com sentido (capa com foto, arte, rabisco), em vez
 * de entregar lixo à IA. Numa página mista (texto de verdade ao lado de uma foto) fica o texto.
 */
export function buildPageText(recognized: OcrLines): OcrPageText {
  const lines: string[] = [];
  let words = 0;
  let keptWords = 0;
  let meaningful = 0;
  let confidenceSum = 0;

  for (const line of recognized) {
    const kept = line.filter((word) => {
      words += 1;

      return word.confidence >= MIN_WORD_CONFIDENCE && HAS_CONTENT.test(word.text);
    });

    if (kept.length === 0) {
      continue;
    }

    keptWords += kept.length;
    meaningful += kept.filter((word) => MEANINGFUL_WORD.test(word.text)).length;
    confidenceSum += kept.reduce((sum, word) => sum + word.confidence, 0);
    lines.push(kept.map((word) => word.text).join(' '));
  }

  if (meaningful < MIN_MEANINGFUL_WORDS) {
    return { lines: [], words, keptWords: 0, confidence: 0 };
  }

  return { lines, words, keptWords, confidence: Math.round(confidenceSum / keptWords) };
}
