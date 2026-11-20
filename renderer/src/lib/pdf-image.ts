/** Pontos de PDF por pixel de tela (72 pontos por polegada contra 96 pixels). */
const POINTS_PER_PIXEL = 0.75;

const encoder = new TextEncoder();

/** Número curto para o PDF (sem notação científica, até 2 casas). */
const num = (value: number) => String(Math.round(value * 100) / 100);

/**
 * Monta um PDF de **uma página** do tamanho da imagem, com um JPEG ocupando a página inteira. É o
 * jeito de entregar o infográfico em PDF sem depender de impressão: a página tem o tamanho do
 * desenho (uma folha só, longa) e a imagem fica nítida porque o JPEG vai como está (`DCTDecode`).
 * `imageWidth` e `imageHeight` são os pixels do JPEG; `pageWidth` e `pageHeight`, os pixels de tela
 * que ele ocupa (viram pontos, a 96 dpi).
 */
export function buildImagePdf(
  jpeg: Uint8Array,
  size: { imageWidth: number; imageHeight: number; pageWidth: number; pageHeight: number },
): Uint8Array {
  const width = size.pageWidth * POINTS_PER_PIXEL;
  const height = size.pageHeight * POINTS_PER_PIXEL;
  const content = `q ${num(width)} 0 0 ${num(height)} 0 0 cm /Im0 Do Q`;

  const text = (value: string) => encoder.encode(value);
  const objects: Uint8Array[][] = [
    [text('<< /Type /Catalog /Pages 2 0 R >>')],
    [text('<< /Type /Pages /Kids [3 0 R] /Count 1 >>')],
    [
      text(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(width)} ${num(height)}] ` +
          '/Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>',
      ),
    ],
    [text(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`)],
    [
      text(
        `<< /Type /XObject /Subtype /Image /Width ${size.imageWidth} /Height ${size.imageHeight} ` +
          `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      ),
      jpeg,
      text('\nendstream'),
    ],
  ];

  const parts: Uint8Array[] = [text('%PDF-1.4\n')];
  const offsets: number[] = [];
  let length = parts[0].length;

  objects.forEach((body, index) => {
    offsets.push(length);

    const chunks = [text(`${index + 1} 0 obj\n`), ...body, text('\nendobj\n')];

    for (const chunk of chunks) {
      parts.push(chunk);
      length += chunk.length;
    }
  });

  const xref =
    `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` +
    offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('') +
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${length}\n%%EOF\n`;

  parts.push(text(xref));

  const pdf = new Uint8Array(length + parts[parts.length - 1].length);
  let at = 0;

  for (const part of parts) {
    pdf.set(part, at);
    at += part.length;
  }

  return pdf;
}

/** Bytes em base64 (em pedaços, para não estourar a pilha com arquivos grandes). */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const step = 0x8000;

  for (let i = 0; i < bytes.length; i += step) {
    binary += String.fromCharCode(...bytes.subarray(i, i + step));
  }

  return btoa(binary);
}

/** Texto (UTF-8) em base64. */
export const textToBase64 = (value: string): string => bytesToBase64(encoder.encode(value));
