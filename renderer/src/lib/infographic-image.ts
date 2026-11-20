import { toPng } from 'html-to-image';

/** Resolução da imagem: 2x deixa o texto nítido em telas e impressão. */
export const IMAGE_PIXEL_RATIO = 2;

const DATA_URL_PREFIX = /^data:image\/png;base64,/;

/**
 * A biblioteca de captura perde o que vem de classe CSS dentro de SVG (as peças usam classes de
 * tom). Antes da foto, fixa na própria tag o preenchimento e o traço já calculados; devolve quem
 * desfaz isso depois.
 */
function pinSvgPaint(stage: HTMLElement): () => void {
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

/**
 * Tira uma foto do infográfico **inteiro** no tamanho natural: com o fundo do quadro ou, com
 * `transparent`, **sem fundo e sem borda** (PNG transparente, para pôr sobre qualquer coisa; o
 * texto continua nas cores do tema atual). Devolve o PNG em base64, sem o prefixo `data:`.
 */
export async function captureInfographicPng(
  stage: HTMLElement,
  transparent: boolean,
): Promise<string> {
  const restorePaint = pinSvgPaint(stage);

  try {
    const dataUrl = await toPng(stage, {
      width: stage.offsetWidth,
      height: stage.offsetHeight,
      pixelRatio: IMAGE_PIXEL_RATIO,
      ...(transparent ? { style: { background: 'transparent', border: 'none' } } : {}),
    });

    return dataUrl.replace(DATA_URL_PREFIX, '');
  } finally {
    restorePaint();
  }
}
