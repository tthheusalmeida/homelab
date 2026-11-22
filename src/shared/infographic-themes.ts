import {
  INFOGRAPHIC_PIECES,
  INFOGRAPHIC_THEMES,
  type InfographicThemeId,
} from './infographic-pieces';
import { singular, synonymsOf } from './infographic-synonyms';
import { stemOf, wordsOf } from './infographic-text';

/** Quantos temas (fora o das genéricas) entram, no máximo, no prompt do infográfico. */
export const PROMPT_THEME_COUNT = 4;

/** Havendo sinal, entram pelo menos estes temas (os mais bem pontuados): um tema só deixa a história sem variedade de peças. */
export const MIN_THEMES = 3;

/** Do terceiro tema em diante, quanto um tema precisa pontuar, em relação ao melhor, para entrar: corta os que só tocaram no assunto. */
const MIN_SHARE_OF_BEST = 0.2;

/**
 * Pontuação que o melhor tema precisa ter para o sinal valer. Abaixo disso o resumo não tem palavras
 * suficientes do banco (assunto técnico, texto curto), e cortar o catálogo seria chute: o prompt leva
 * o banco inteiro.
 */
export const MIN_CONFIDENCE = 2.5;

/** Quantas vezes, no máximo, a mesma palavra do resumo conta (uma palavra repetida 50 vezes não decide sozinha). */
const MAX_COUNT_PER_WORD = 3;

/** A mesma palavra vale 1; um sinônimo, metade; só a raiz parecida, menos ainda (e só em palavra longa). */
const EXACT_WEIGHT = 1;
const SYNONYM_WEIGHT = 0.5;
const STEM_WEIGHT = 0.4;

/** Raiz de 5 letras junta palavras de sentido diferente ("inter" é internet e internacional): só vale em palavra longa. */
const MIN_STEM_WORD_LENGTH = 6;

/** O que do resumo é lido: textos enormes são cortados (o começo diz o assunto). */
const MAX_TEXT_CHARS = 60_000;

const THEME_ORDER = Object.keys(INFOGRAPHIC_THEMES) as InfographicThemeId[];

type ThemeSet = ReadonlySet<InfographicThemeId>;

/** Palavra do banco (no singular) -> temas que a têm no nome ou nas palavras-chave das peças ou no nome do tema. */
const THEMES_OF_WORD = new Map<string, Set<InfographicThemeId>>();
/** Raiz de cada palavra longa do banco -> temas. */
const THEMES_OF_STEM = new Map<string, Set<InfographicThemeId>>();

(() => {
  const add = (word: string, theme: InfographicThemeId) => {
    const exact = singular(word);

    THEMES_OF_WORD.set(exact, (THEMES_OF_WORD.get(exact) ?? new Set()).add(theme));

    if (word.length >= MIN_STEM_WORD_LENGTH) {
      const root = stemOf(word);

      THEMES_OF_STEM.set(root, (THEMES_OF_STEM.get(root) ?? new Set()).add(theme));
    }
  };

  for (const piece of INFOGRAPHIC_PIECES) {
    if (piece.theme !== 'generico') {
      for (const word of [...wordsOf(piece.name), ...wordsOf(piece.tags)]) {
        add(word, piece.theme);
      }
    }
  }

  for (const theme of THEME_ORDER) {
    if (theme !== 'generico') {
      for (const word of wordsOf(INFOGRAPHIC_THEMES[theme])) {
        add(word, theme);
      }
    }
  }
})();

/** Palavra do resumo -> quantas vezes aparece. */
function countWords(text: string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const word of wordsOf(text.slice(0, MAX_TEXT_CHARS))) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return counts;
}

function addScore(scores: Map<InfographicThemeId, number>, themes: ThemeSet, value: number): void {
  const share = value / themes.size;

  for (const theme of themes) {
    scores.set(theme, (scores.get(theme) ?? 0) + share);
  }
}

/**
 * Os temas do banco de peças que mais combinam com o texto de um resumo, do mais para o menos
 * provável (no máximo `max` e, havendo sinal, pelo menos `MIN_THEMES`; sem o das genéricas, que
 * sempre acompanha). Cada palavra do resumo vale pelos temas que a têm no nome ou nas palavras-chave
 * das peças, **menos** quanto mais temas a têm (uma palavra que aparece em tudo não diz nada). A
 * palavra exata vale 1, um sinônimo metade e uma palavra longa de mesma raiz 0,4. `null` quando o
 * sinal é fraco (o melhor tema fica abaixo de `MIN_CONFIDENCE`): o prompt leva o banco inteiro.
 *
 * Serve para o prompt do infográfico não levar as 416 peças (83% do prompt): só os temas prováveis.
 * Se o tema ficar errado, quem completa as peças é o `PieceResolver`, com o banco inteiro.
 */
export function selectRelevantThemes(
  text: string,
  max: number = PROMPT_THEME_COUNT,
): InfographicThemeId[] | null {
  const scores = new Map<InfographicThemeId, number>();

  for (const [word, count] of countWords(text)) {
    const capped = Math.min(count, MAX_COUNT_PER_WORD);
    const exact = THEMES_OF_WORD.get(singular(word));

    if (exact) {
      addScore(scores, exact, EXACT_WEIGHT * capped);
    } else {
      if (word.length >= MIN_STEM_WORD_LENGTH) {
        const byStem = THEMES_OF_STEM.get(stemOf(word));

        if (byStem) {
          addScore(scores, byStem, STEM_WEIGHT * capped);
        }
      }

      for (const synonym of synonymsOf(singular(word))) {
        const related = THEMES_OF_WORD.get(singular(synonym));

        if (related) {
          addScore(scores, related, SYNONYM_WEIGHT * capped);
        }
      }
    }
  }

  const ranked = THEME_ORDER.filter((theme) => (scores.get(theme) ?? 0) > 0).sort(
    (a, b) => (scores.get(b) ?? 0) - (scores.get(a) ?? 0),
  );
  const best = ranked.length > 0 ? (scores.get(ranked[0]) ?? 0) : 0;

  if (best < MIN_CONFIDENCE) {
    return null;
  }

  return ranked
    .filter(
      (theme, index) => index < MIN_THEMES || (scores.get(theme) ?? 0) >= best * MIN_SHARE_OF_BEST,
    )
    .slice(0, max);
}
