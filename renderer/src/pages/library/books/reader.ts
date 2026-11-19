import { headingIdsByLine } from "#lib/markdown";

import type { BookSearchHit } from "./types";

/** `id` do bloco de um capítulo na leitura contínua. */
export const chapterElementId = (documentId: string) => `chapter-${documentId}`;

/** `id` de um título dentro de um capítulo (mesmo `idPrefix` do texto). */
export const headingElementId = (documentId: string, headingId: string) =>
  `${documentId}-${headingId}`;

/**
 * Para onde rolar ao clicar num resultado: o título mais próximo acima da
 * linha encontrada; sem título antes dela, o começo do capítulo.
 */
export function hitTargetId(hit: BookSearchHit, content: string): string {
  let best: { line: number; id: string } | null = null;

  for (const [line, id] of headingIdsByLine(content)) {
    if (line <= hit.line && (best === null || line > best.line)) {
      best = { line, id };
    }
  }

  return best
    ? headingElementId(hit.documentId, best.id)
    : chapterElementId(hit.documentId);
}

/**
 * Cor do destaque com respiro: o padding afasta o fundo das letras e a margem negativa de mesmo
 * tamanho compensa, então o texto não se mexe quando o destaque entra e sai.
 */
const HIGHLIGHT_CLASSES = [
  "bg-primary/15",
  "rounded-md",
  "-mx-3",
  "px-3",
  "-my-1.5",
  "py-1.5",
];

/** Rola até o elemento e destaca por um instante (para onde o leitor foi levado). */
export function goToElement(elementId: string) {
  const element = document.getElementById(elementId);

  if (!element) {
    return;
  }

  element.scrollIntoView?.({ behavior: "smooth", block: "start" });
  element.classList.add(...HIGHLIGHT_CLASSES);
  window.setTimeout(() => element.classList.remove(...HIGHLIGHT_CLASSES), 1800);
}
