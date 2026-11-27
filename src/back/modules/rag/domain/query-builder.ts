import type { QueryTerm } from './bm25-index';
import { analyze, editDistance } from './text-analysis';

/** Peso de uma forma corrigida: vale menos que a palavra que o usuário realmente escreveu. */
const PREFIX_WEIGHT = 0.6;
const FUZZY_WEIGHT = 0.5;
const MAX_ALTERNATIVES = 3;
const MIN_PREFIX_LENGTH = 3;

/** Quantos erros de digitação aceitar, conforme o tamanho (palavra curta tolera menos). */
function allowedEdits(length: number): number {
  if (length <= 3) {
    return 0;
  }

  return length <= 7 ? 1 : 2;
}

/**
 * Transforma a pergunta em termos de busca. Cada palavra que **existe** nas páginas fica como
 * está. Cada palavra que **não existe** (erro de digitação ou começo de palavra) ganha as
 * formas mais parecidas que existem, com peso menor; as mais comuns nas páginas vêm primeiro.
 *
 * @param vocabulary termo → em quantos trechos aparece (do índice)
 */
export function buildQuery(question: string, vocabulary: ReadonlyMap<string, number>): QueryTerm[] {
  return analyze(question).map((term) => {
    if (vocabulary.has(term)) {
      return { alternatives: [{ term, weight: 1 }] };
    }

    return { alternatives: closestTerms(term, vocabulary) };
  });
}

function closestTerms(
  term: string,
  vocabulary: ReadonlyMap<string, number>,
): QueryTerm['alternatives'] {
  const maxEdits = allowedEdits(term.length);
  const found: Array<{ term: string; weight: number; frequency: number }> = [];

  for (const [candidate, frequency] of vocabulary) {
    if (term.length >= MIN_PREFIX_LENGTH && candidate.startsWith(term)) {
      found.push({ term: candidate, weight: PREFIX_WEIGHT, frequency });
      continue;
    }

    if (maxEdits === 0) {
      continue;
    }

    const distance = editDistance(term, candidate, maxEdits);

    if (distance <= maxEdits) {
      found.push({ term: candidate, weight: FUZZY_WEIGHT / distance, frequency });
    }
  }

  return found
    .sort((a, b) => b.weight - a.weight || b.frequency - a.frequency)
    .slice(0, MAX_ALTERNATIVES)
    .map(({ term: alternative, weight }) => ({ term: alternative, weight }));
}
