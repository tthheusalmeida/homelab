/**
 * Palavras que contam na busca. Quando a consulta tem palavras maiores, as de até 2 letras
 * ("da", "de", "a") ficam de fora: casariam com quase tudo.
 */
export function significantWords(words: string[]): string[] {
  const long = words.filter((word) => word.length > 2);

  return long.length > 0 ? long : words;
}
