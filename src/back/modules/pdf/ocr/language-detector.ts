import { LANGUAGE_WORDS } from './language-profiles';
import { OCR_LANGUAGE_IDS, type OcrLanguageId } from './ocr-languages';

export interface LanguageShare {
  language: OcrLanguageId;
  /** Fração (0 a 1) das palavras classificadas que são deste idioma. */
  share: number;
}

export interface DetectOptions {
  /** Idioma só entra se tiver ao menos esta fração das palavras (o dominante sempre entra). */
  minShare?: number;
  /** No máximo quantos idiomas devolver. */
  maxLanguages?: number;
}

/** Trecho com menos palavras que isto não diz o idioma com segurança. */
const MIN_SEGMENT_WORDS = 3;

/** Pontuação mínima (em palavras "típicas") para um trecho valer. */
const MIN_SEGMENT_SCORE = 1;

/** O melhor idioma precisa pontuar ao menos isto vezes o segundo; senão o trecho é ambíguo. */
const MIN_MARGIN = 1.3;

/** Um idioma que não é o principal só vale com ao menos tantos trechos (um trecho solto é ruído). */
const MIN_SECONDARY_SEGMENTS = 2;

const DEFAULT_MIN_SHARE = 0.15;
const DEFAULT_MAX_LANGUAGES = 3;

/**
 * Peso de cada palavra em cada idioma: palavras que existem em vários idiomas ("de", "que", "la")
 * valem menos (1 ÷ quantos idiomas a têm); as exclusivas valem 1.
 */
function buildWeights(): Map<string, Map<OcrLanguageId, number>> {
  const owners = new Map<string, OcrLanguageId[]>();

  for (const language of OCR_LANGUAGE_IDS) {
    for (const word of LANGUAGE_WORDS[language]) {
      owners.set(word, [...new Set([...(owners.get(word) ?? []), language])]);
    }
  }

  const weights = new Map<string, Map<OcrLanguageId, number>>();

  for (const [word, languages] of owners) {
    weights.set(word, new Map(languages.map((language) => [language, 1 / languages.length])));
  }

  return weights;
}

const WEIGHTS = buildWeights();

const stripAccents = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

const wordsOf = (segment: string): string[] =>
  stripAccents(segment.toLowerCase()).match(/[a-z]+/g) ?? [];

function classify(words: string[]): OcrLanguageId | null {
  if (words.length < MIN_SEGMENT_WORDS) {
    return null;
  }

  const scores = new Map<OcrLanguageId, number>();

  for (const word of words) {
    for (const [language, weight] of WEIGHTS.get(word) ?? []) {
      scores.set(language, (scores.get(language) ?? 0) + weight);
    }
  }

  const ranked = [...scores].sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;

  if (!best || best[1] < MIN_SEGMENT_SCORE) {
    return null;
  }

  return !second || best[1] >= second[1] * MIN_MARGIN ? best[0] : null;
}

/**
 * Descobre o idioma (ou os idiomas) de um texto. O texto é dividido em trechos (frases e linhas);
 * cada trecho é atribuído a um idioma pelas palavras comuns que contém, e a fração de palavras de
 * cada idioma diz o quanto ele aparece. Serve a documentos mistos: uma aula de francês explicada em
 * português devolve os dois. Devolve `[]` quando o texto não tem sinal suficiente (ex.: escrita
 * que o app não reconhece ou texto curto demais).
 */
export function detectLanguages(text: string, options: DetectOptions = {}): LanguageShare[] {
  const minShare = options.minShare ?? DEFAULT_MIN_SHARE;
  const maxLanguages = options.maxLanguages ?? DEFAULT_MAX_LANGUAGES;
  const counts = new Map<OcrLanguageId, number>();
  const segments = new Map<OcrLanguageId, number>();
  let classified = 0;

  for (const segment of text.split(/[\n.!?;:]+/)) {
    const words = wordsOf(segment);
    const language = classify(words);

    if (language) {
      counts.set(language, (counts.get(language) ?? 0) + words.length);
      segments.set(language, (segments.get(language) ?? 0) + 1);
      classified += words.length;
    }
  }

  if (classified === 0) {
    return [];
  }

  const ranked = [...counts]
    .map(([language, words]) => ({ language, share: words / classified }))
    .sort((a, b) => b.share - a.share);

  return ranked
    .filter(
      (entry, index) =>
        index === 0 ||
        (entry.share >= minShare && (segments.get(entry.language) ?? 0) >= MIN_SECONDARY_SEGMENTS),
    )
    .slice(0, maxLanguages);
}
