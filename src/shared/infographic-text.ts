/**
 * Leitura de texto para achar peças do infográfico: tira acento e pontuação, ignora palavras que não
 * ajudam e reduz cada palavra à raiz. É usada pelo `PieceResolver` (que completa as peças que a IA
 * deixou vazias) e pela escolha dos temas que entram no prompt (`selectRelevantThemes`), para as duas
 * lerem o texto do mesmo jeito.
 */

/** Palavras que não ajudam a achar uma peça. */
const STOP = new Set([
  'para',
  'com',
  'uma',
  'umas',
  'uns',
  'dos',
  'das',
  'por',
  'que',
  'como',
  'mais',
  'menos',
  'sobre',
  'entre',
  'sem',
  'sao',
  'ser',
  'tem',
  'seu',
  'sua',
  'seus',
  'suas',
  'isso',
  'esse',
  'essa',
  'ate',
  'nos',
  'nas',
  'pelo',
  'pela',
  'quando',
  'onde',
  'cada',
  'muito',
  'muitos',
]);

/** Minúsculas, sem acento e sem pontuação. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** As palavras úteis de um texto (3 letras ou mais, fora as que não ajudam), já normalizadas. */
export function wordsOf(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter((word) => word.length >= 3 && !STOP.has(word));
}

/** Raiz curta de uma palavra: "endividamento" e "endividar" se encontram em "endivi". */
export const stemOf = (word: string): string => word.slice(0, 5);
