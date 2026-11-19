import { toPng } from 'html-to-image';

/** Folga (px) em volta do mapa na imagem. */
export const IMAGE_PADDING = 40;
/** Resolução da imagem: 2x deixa o texto nítido em telas e impressão. */
export const IMAGE_PIXEL_RATIO = 2;

const DATA_URL_PREFIX = /^data:image\/png;base64,/;

/** Nome sugerido para o arquivo (o diálogo do sistema deixa o usuário trocar). */
export function mindMapImageName(title: string, transparent = false): string {
  const clean = title.replace(/\s+/g, ' ').trim().slice(0, 80);
  const name = clean ? `Mapa mental - ${clean}` : 'Mapa mental';

  return transparent ? `${name} (sem fundo)` : name;
}

/**
 * A biblioteca de captura perde o preenchimento que vem de classe CSS dentro de SVG (o ícone da
 * colmeia, por exemplo, sairia preto). Antes da foto, fixa na própria tag a cor já calculada; devolve
 * quem desfaz isso depois.
 */
function pinSvgPaint(stage: HTMLElement): () => void {
  const undo: Array<() => void> = [];

  for (const element of stage.querySelectorAll<SVGElement>('svg *')) {
    const { fill } = getComputedStyle(element);
    const previous = element.style.fill;

    if (fill) {
      element.style.fill = fill;
      undo.push(() => {
        element.style.fill = previous;
      });
    }
  }

  return () => undo.forEach((restore) => restore());
}

/**
 * Tira uma foto do mapa **inteiro** (não só da parte que aparece na área): o desenho é capturado
 * no tamanho natural, sem o arrastar e o zoom de agora, com a folga em volta e o fundo da área
 * (`background`) ou, com `null`, **sem fundo** (PNG transparente, para pôr sobre qualquer coisa; o texto
 * continua nas cores do tema atual). Devolve o PNG em base64, sem o prefixo `data:`. O que está recolhido continua recolhido.
 */
export async function captureMindMapPng(
  stage: HTMLElement,
  background: string | null,
): Promise<string> {
  const width = stage.offsetWidth;
  const height = stage.offsetHeight;

  const restorePaint = pinSvgPaint(stage);

  try {
    const dataUrl = await toPng(stage, {
      width: width + IMAGE_PADDING * 2,
      height: height + IMAGE_PADDING * 2,
      pixelRatio: IMAGE_PIXEL_RATIO,
      ...(background === null ? {} : { backgroundColor: background }),
      style: {
        transform: `translate(${IMAGE_PADDING}px, ${IMAGE_PADDING}px) scale(1)`,
        width: `${width}px`,
      },
    });

    return dataUrl.replace(DATA_URL_PREFIX, '');
  } finally {
    restorePaint();
  }
}
