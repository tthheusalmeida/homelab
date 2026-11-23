/** `id` do bloco de um capítulo na leitura contínua. */
export const chapterElementId = (documentId: string) => `chapter-${documentId}`;

/** `id` de um título dentro de um capítulo (mesmo `idPrefix` do texto). */
export const headingElementId = (documentId: string, headingId: string) =>
  `${documentId}-${headingId}`;

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
