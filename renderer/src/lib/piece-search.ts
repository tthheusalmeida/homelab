import {
  INFOGRAPHIC_PIECES,
  INFOGRAPHIC_THEMES,
  type InfographicPieceInfo,
} from '#shared/infographic-pieces';
import { singular, synonymsOf } from '#shared/infographic-synonyms';

/** Sem acento e em minúsculas, para a busca achar "calculadora" ao digitar "Cálculadora". */
export const normalizeSearch = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

interface Indexed {
  /** Nome, chave, palavras-chave e tema, já normalizados (a busca por trecho olha aqui). */
  text: string;
  /** Palavras do nome e das palavras-chave no singular (a busca por sinônimo olha aqui). */
  words: Set<string>;
}

/**
 * Índice da busca, montado **uma vez** (e só quando alguém busca pela primeira vez): a cada letra
 * digitada, a busca só compara textos que já estão prontos. Usa o catálogo leve, nunca os desenhos.
 */
let index: Map<string, Indexed> | null = null;

function indexOf(piece: InfographicPieceInfo): Indexed {
  index ??= new Map(
    INFOGRAPHIC_PIECES.map((entry) => [
      entry.key,
      {
        text: normalizeSearch(
          `${entry.name} ${entry.key} ${entry.tags} ${INFOGRAPHIC_THEMES[entry.theme]}`,
        ),
        words: new Set(
          normalizeSearch(`${entry.name} ${entry.tags}`)
            .split(/[^a-z0-9]+/)
            .filter(Boolean)
            .map(singular),
        ),
      },
    ]),
  );

  return index.get(piece.key) as Indexed;
}

/**
 * Monta o filtro de uma busca. Uma peça entra se o texto digitado aparece no nome, na chave, nas
 * palavras-chave ou no tema, **ou** se cada palavra digitada aparece assim ou tem um sinônimo entre as
 * palavras da peça ("grana" acha o dinheiro). Busca vazia deixa tudo passar. Palavras com menos de
 * 3 letras só valem por trecho.
 */
export function createPieceMatcher(query: string): (piece: InfographicPieceInfo) => boolean {
  const needle = normalizeSearch(query.trim());

  if (needle === '') {
    return () => true;
  }

  const typed = needle.split(/\s+/);
  const related = typed.map((word) => (word.length >= 3 ? synonymsOf(word).map(singular) : []));

  return (piece) => {
    const { text, words } = indexOf(piece);

    return (
      text.includes(needle) ||
      typed.every(
        (word, position) =>
          text.includes(word) || related[position].some((synonym) => words.has(synonym)),
      )
    );
  };
}
