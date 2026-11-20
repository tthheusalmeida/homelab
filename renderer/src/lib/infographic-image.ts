import { toJpeg, toPng, toSvg } from 'html-to-image';

import { buildImagePdf, bytesToBase64, textToBase64 } from './pdf-image';

/** Resolução da imagem: 2x deixa o texto nítido em telas e impressão. */
export const IMAGE_PIXEL_RATIO = 2;

const DATA_URL_PREFIX = /^data:image\/png;base64,/;

/** Qualidade do JPEG que vai dentro do PDF (alta: o texto continua legível ao dar zoom). */
const PDF_JPEG_QUALITY = 0.92;

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

/** Texto de um `data:image/svg+xml` (em base64 ou com porcentagens), já decodificado. */
function svgTextOf(dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, comma);
  const payload = dataUrl.slice(comma + 1);

  if (header.includes(';base64')) {
    return new TextDecoder().decode(Uint8Array.from(atob(payload), (char) => char.charCodeAt(0)));
  }

  return decodeURIComponent(payload);
}

/**
 * O infográfico **inteiro** como SVG (em base64): o texto e as peças ficam nítidos em qualquer
 * tamanho. O desenho vai dentro de um `foreignObject`, então abre bem em navegadores e nos editores
 * que o entendem, mas nem todo editor de vetores o desenha.
 */
export async function captureInfographicSvg(
  stage: HTMLElement,
  transparent: boolean,
): Promise<string> {
  const restorePaint = pinSvgPaint(stage);

  try {
    const dataUrl = await toSvg(stage, {
      width: stage.offsetWidth,
      height: stage.offsetHeight,
      ...(transparent ? { style: { background: 'transparent', border: 'none' } } : {}),
    });

    return textToBase64(svgTextOf(dataUrl));
  } finally {
    restorePaint();
  }
}

/** Cor de fundo do quadro; se for transparente, a do app; no pior caso, branco (JPEG não tem transparência). */
function solidBackgroundOf(stage: HTMLElement): string {
  for (const element of [stage, document.body]) {
    const { backgroundColor } = getComputedStyle(element);

    if (
      backgroundColor &&
      backgroundColor !== 'transparent' &&
      backgroundColor !== 'rgba(0, 0, 0, 0)'
    ) {
      return backgroundColor;
    }
  }

  return '#ffffff';
}

/**
 * O infográfico **inteiro** como PDF de uma página só, do tamanho do desenho (em base64). A página é
 * uma imagem de alta resolução, com o fundo do quadro; para vetor, use o SVG.
 */
export async function captureInfographicPdf(stage: HTMLElement): Promise<string> {
  const restorePaint = pinSvgPaint(stage);

  try {
    const dataUrl = await toJpeg(stage, {
      width: stage.offsetWidth,
      height: stage.offsetHeight,
      pixelRatio: IMAGE_PIXEL_RATIO,
      quality: PDF_JPEG_QUALITY,
      backgroundColor: solidBackgroundOf(stage),
    });
    const jpeg = Uint8Array.from(atob(dataUrl.slice(dataUrl.indexOf(',') + 1)), (char) =>
      char.charCodeAt(0),
    );

    return bytesToBase64(
      buildImagePdf(jpeg, {
        imageWidth: stage.offsetWidth * IMAGE_PIXEL_RATIO,
        imageHeight: stage.offsetHeight * IMAGE_PIXEL_RATIO,
        pageWidth: stage.offsetWidth,
        pageHeight: stage.offsetHeight,
      }),
    );
  } finally {
    restorePaint();
  }
}
