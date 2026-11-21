/** Quanto dos resumos vai à IA que preenche os dados da página (os resumos juntos podem ser enormes). */
export const PAGE_DIGEST_CHARS = 12_000;

const SEPARATOR = '\n\n';

/** Corta no fim de um parágrafo (ou de uma linha) dentro do limite, para não terminar no meio de uma frase. */
function cutAtBoundary(text: string, limit: number): string {
  if (text.length <= limit) {
    return text;
  }

  const head = text.slice(0, limit);
  const boundary = Math.max(head.lastIndexOf('\n\n'), head.lastIndexOf('\n'));

  return (boundary > limit * 0.5 ? head.slice(0, boundary) : head).trimEnd();
}

/**
 * Amostra dos resumos para a passada que preenche título, categoria e tags. Cabendo no limite, vai o
 * texto todo; senão, **cada parte entra com uma fatia igual do começo**, para o documento inteiro
 * (e não só o início do livro) estar representado.
 */
export function buildPageDigest(summaries: string[], maxChars: number = PAGE_DIGEST_CHARS): string {
  const parts = summaries.map((summary) => summary.trim()).filter(Boolean);
  const whole = parts.join(SEPARATOR);

  if (whole.length <= maxChars || parts.length === 0) {
    return whole;
  }

  const budget = Math.floor((maxChars - SEPARATOR.length * (parts.length - 1)) / parts.length);

  return parts.map((part) => cutAtBoundary(part, Math.max(budget, 1))).join(SEPARATOR);
}
