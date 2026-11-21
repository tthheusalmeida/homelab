import { toPng } from 'html-to-image';

import { DATA_URL_PREFIX, IMAGE_PIXEL_RATIO, pinSvgPaint } from './image-capture';

export { IMAGE_PIXEL_RATIO };

/** Folga (px) em volta do mapa na imagem. */
export const IMAGE_PADDING = 40;

/** Nome sugerido para o arquivo (o diálogo do sistema deixa o usuário trocar). */
export function mindMapImageName(title: string, transparent = false): string {
  const clean = title.replace(/\s+/g, ' ').trim().slice(0, 80);
  const name = clean ? `Mapa mental - ${clean}` : 'Mapa mental';

  return transparent ? `${name} (sem fundo)` : name;
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
