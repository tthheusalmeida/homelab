/** Resolução da imagem: 2x deixa o texto nítido em telas e impressão. */
export const IMAGE_PIXEL_RATIO = 2;

/** Prefixo do PNG em `data:`; as capturas devolvem só o base64. */
export const DATA_URL_PREFIX = /^data:image\/png;base64,/;

/**
 * A biblioteca de captura perde o que vem de classe CSS dentro de SVG (as peças e o ícone da colmeia
 * usam classes de tom, e sairiam pretos). Antes da foto, fixa na própria tag o preenchimento e o traço
 * já calculados; devolve quem desfaz isso depois. Compartilhado pelo infográfico e pelo mapa mental.
 */
export function pinSvgPaint(stage: HTMLElement): () => void {
  const undo: Array<() => void> = [];

  for (const element of stage.querySelectorAll<SVGElement>('svg *')) {
    const { fill, stroke } = getComputedStyle(element);
    const previousFill = element.style.fill;
    const previousStroke = element.style.stroke;

    if (fill) {
      element.style.fill = fill;
    }

    if (stroke) {
      element.style.stroke = stroke;
    }

    undo.push(() => {
      element.style.fill = previousFill;
      element.style.stroke = previousStroke;
    });
  }

  return () => undo.forEach((restore) => restore());
}
