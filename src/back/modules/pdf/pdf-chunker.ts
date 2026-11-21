import { splitText } from '../../utils/text';

/** Tamanho padrão de cada parte enviada à IA: ~8 mil tokens, bem abaixo do limite de saída dos modelos. */
export const PDF_CHUNK_CHARS = 32_000;

export interface PdfChunk {
  /** Posição da parte (a partir de 0). */
  index: number;
  /** Primeira e última página que a parte cobre (a partir de 1). */
  startPage: number;
  endPage: number;
  text: string;
}

interface Piece {
  page: number;
  text: string;
}

const SEPARATOR = '\n\n';

/** Quebra um parágrafo maior que o limite em frases (e, se preciso, em palavras). */
function splitBig(text: string, maxChars: number): string[] {
  return text.length <= maxChars ? [text] : splitText(text, maxChars);
}

/** Divide uma página em pedaços de até `maxChars`, preferindo cortar entre parágrafos. */
function piecesOf(page: number, text: string, maxChars: number): Piece[] {
  return text
    .split(/\n{2,}/)
    .flatMap((paragraph) => splitBig(paragraph, maxChars))
    .map((part) => ({ page, text: part }));
}

/**
 * Agrupa as páginas em partes de até `maxChars` caracteres, na ordem do documento. Uma parte nunca
 * corta no meio de um parágrafo (a menos que o parágrafo sozinho passe do limite) e guarda de que
 * páginas veio, para a IA e o usuário saberem onde está cada trecho. Páginas vazias são ignoradas.
 */
export function chunkPages(pages: string[], maxChars: number = PDF_CHUNK_CHARS): PdfChunk[] {
  const chunks: PdfChunk[] = [];
  let texts: string[] = [];
  let size = 0;
  let startPage = 0;
  let endPage = 0;

  const close = (): void => {
    if (texts.length > 0) {
      chunks.push({ index: chunks.length, startPage, endPage, text: texts.join(SEPARATOR) });
    }

    texts = [];
    size = 0;
  };

  pages.forEach((text, position) => {
    if (!text.trim()) {
      return;
    }

    for (const piece of piecesOf(position + 1, text, maxChars)) {
      const extra = (texts.length > 0 ? SEPARATOR.length : 0) + piece.text.length;

      if (texts.length > 0 && size + extra > maxChars) {
        close();
      }

      if (texts.length === 0) {
        startPage = piece.page;
      }

      size += (texts.length > 0 ? SEPARATOR.length : 0) + piece.text.length;
      texts.push(piece.text);
      endPage = piece.page;
    }
  });

  close();

  return chunks;
}
