import { scanHeadings } from '../../../../shared/markdown-headings';

/**
 * Um trecho de uma página: o pedaço que a busca devolve e que, mais tarde, vai para a IA. Guarda
 * de onde veio (cabeçalhos, âncora e linha), que é o que permite abrir a página **na seção certa**.
 */
export interface Chunk {
  /** Posição do trecho na página (0, 1, 2…). */
  ordinal: number;
  /** Títulos que levam até o trecho, do maior ao menor: ["Resumo", "Primeira Maneira"]. */
  headingPath: string[];
  /** Id de âncora do título mais próximo (o mesmo do visualizador); `null` antes do 1º título. */
  anchor: string | null;
  /** Linha (base 1, no corpo da página) onde o trecho começa. */
  line: number;
  text: string;
}

/** Tamanho máximo de um trecho: grande o bastante para ter contexto, pequeno para ser preciso. */
export const MAX_CHUNK_CHARS = 1600;

interface Piece {
  line: number;
  text: string;
}

/**
 * Quebra o corpo de uma página em trechos, um por seção. Seção grande é dividida por parágrafo
 * (sem partir bloco de código); seção sem texto não gera trecho (o título dela continua no
 * caminho dos trechos de baixo).
 */
export function chunkMarkdown(body: string, maxChars = MAX_CHUNK_CHARS): Chunk[] {
  const lines = body.split(/\r?\n/);
  const headings = scanHeadings(body);
  const chunks: Chunk[] = [];
  const stack: Array<{ level: number; text: string }> = [];

  const addSection = (from: number, to: number, anchor: string | null): void => {
    for (const piece of splitSection(lines.slice(from, to), from + 1, maxChars)) {
      chunks.push({
        ordinal: chunks.length,
        headingPath: stack.map(({ text }) => text),
        anchor,
        line: piece.line,
        text: piece.text,
      });
    }
  };

  addSection(0, (headings[0]?.line ?? lines.length + 1) - 1, null);

  headings.forEach((heading, index) => {
    while (stack.length > 0 && stack[stack.length - 1].level >= heading.level) {
      stack.pop();
    }

    stack.push({ level: heading.level, text: heading.text });

    const next = headings[index + 1]?.line ?? lines.length + 1;

    addSection(heading.line, next - 1, heading.id);
  });

  return chunks;
}

/** Divide as linhas de uma seção em pedaços de até `maxChars`, juntando parágrafos vizinhos. */
function splitSection(sectionLines: string[], firstLine: number, maxChars: number): Piece[] {
  const pieces: Piece[] = [];
  let current = null as Piece | null;

  const flush = (): void => {
    if (current && current.text.trim() !== '') {
      pieces.push({ line: current.line, text: current.text.trim() });
    }

    current = null;
  };

  for (const paragraph of paragraphsOf(sectionLines, firstLine)) {
    for (const part of splitLongParagraph(paragraph, maxChars)) {
      if (current && current.text.length + part.text.length + 2 > maxChars) {
        flush();
      }

      current = current
        ? { line: current.line, text: `${current.text}\n\n${part.text}` }
        : { ...part };
    }
  }

  flush();

  return pieces;
}

/** Parágrafos (separados por linha em branco), sem cortar dentro de bloco de código. */
function paragraphsOf(sectionLines: string[], firstLine: number): Piece[] {
  const paragraphs: Piece[] = [];
  let buffer: string[] = [];
  let start = firstLine;
  let fence = false;

  const close = (): void => {
    const text = buffer.join('\n').trim();

    if (text !== '') {
      paragraphs.push({ line: start, text });
    }

    buffer = [];
  };

  sectionLines.forEach((line, offset) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fence = !fence;
    }

    if (line.trim() === '' && !fence) {
      close();
      start = firstLine + offset + 1;

      return;
    }

    if (buffer.length === 0) {
      start = firstLine + offset;
    }

    buffer.push(line);
  });

  close();

  return paragraphs;
}

/** Parágrafo maior que o limite: divide por frases e, se preciso, por tamanho. */
function splitLongParagraph(paragraph: Piece, maxChars: number): Piece[] {
  if (paragraph.text.length <= maxChars) {
    return [paragraph];
  }

  const parts: string[] = [];
  let buffer = '';

  for (const sentence of paragraph.text.split(/(?<=[.!?])\s+/)) {
    if (buffer !== '' && buffer.length + sentence.length + 1 > maxChars) {
      parts.push(buffer);
      buffer = '';
    }

    buffer = buffer === '' ? sentence : `${buffer} ${sentence}`;
  }

  parts.push(buffer);

  return parts
    .flatMap((part) => hardSlices(part, maxChars))
    .map((text) => ({ line: paragraph.line, text }));
}

function hardSlices(text: string, maxChars: number): string[] {
  const slices: string[] = [];

  for (let i = 0; i < text.length; i += maxChars) {
    slices.push(text.slice(i, i + maxChars));
  }

  return slices;
}
