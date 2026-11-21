/** Mínimo de páginas para reconhecer cabeçalho e rodapé repetidos (com menos, não dá para ter certeza). */
const MIN_PAGES_FOR_REPEATS = 4;

/** Quantas linhas do topo e do pé de cada página podem ser cabeçalho ou rodapé. */
const EDGE_LINES = 2;

/** Fração das páginas em que a linha precisa se repetir para ser tratada como cabeçalho ou rodapé. */
const REPEAT_RATIO = 0.4;

const PAGE_NUMBER =
  /^(?:[-–—]\s*)?(?:(?:p[áa]g(?:ina)?\.?|page)\s*)?\d{1,4}(?:\s*(?:\/|de|of)\s*\d{1,4})?(?:\s*[-–—])?$/i;

const LIST_MARKER = /^(?:[•·▪◦●■\-–*]|\d{1,3}[.)]|[a-z][.)])\s+/i;

const SENTENCE_END = /[.!?:;…]["')\]”’]*$/;

function squash(line: string): string {
  return line.replace(/\s+/g, ' ').trim();
}

/** Assinatura da linha para comparar entre páginas: o número da página muda, o resto não. */
function signature(line: string): string {
  return line.replace(/\d+/g, '#').toLowerCase();
}

function isPageNumber(line: string): boolean {
  return PAGE_NUMBER.test(line);
}

/** Descobre as linhas (por assinatura) que se repetem no topo ou no pé de muitas páginas. */
function findRepeatedEdges(pages: string[][]): Set<string> {
  const counts = new Map<string, number>();

  for (const lines of pages) {
    const edges = new Set<string>();

    for (const line of [...lines.slice(0, EDGE_LINES), ...lines.slice(-EDGE_LINES)]) {
      edges.add(signature(line));
    }

    for (const edge of edges) {
      counts.set(edge, (counts.get(edge) ?? 0) + 1);
    }
  }

  const threshold = Math.max(3, Math.ceil(pages.length * REPEAT_RATIO));

  return new Set([...counts].filter(([, count]) => count >= threshold).map(([edge]) => edge));
}

function dropNoise(lines: string[], repeated: Set<string>): string[] {
  const last = lines.length - 1;

  return lines.filter((line, index) => {
    if (isPageNumber(line)) {
      return false;
    }

    const isEdge = index < EDGE_LINES || index > last - EDGE_LINES;

    return !(isEdge && repeated.has(signature(line)));
  });
}

/**
 * Junta as linhas de uma página em parágrafos: refaz palavras quebradas por hífen no fim da linha e
 * só abre parágrafo novo onde o texto indica (linha curta que termina a frase, ou item de lista).
 */
function toParagraphs(lines: string[]): string {
  if (lines.length === 0) {
    return '';
  }

  const longest = Math.max(...lines.map((line) => line.length));
  const paragraphs: string[] = [];
  let current = lines[0];

  for (let index = 1; index < lines.length; index += 1) {
    const previous = lines[index - 1];
    const line = lines[index];
    const shortLine = previous.length < longest * 0.6;
    const startsParagraph = LIST_MARKER.test(line) || (shortLine && SENTENCE_END.test(previous));

    if (startsParagraph) {
      paragraphs.push(current);
      current = line;
    } else if (/\p{L}-$/u.test(current) && /^\p{Ll}/u.test(line)) {
      current = current.slice(0, -1) + line;
    } else {
      current = `${current} ${line}`;
    }
  }

  paragraphs.push(current);

  return paragraphs.join('\n\n');
}

/**
 * Limpa o texto lido: tira número de página e cabeçalho/rodapé repetidos e organiza as linhas em
 * parágrafos. Devolve um texto por página (vazio quando a página não tinha texto).
 */
export function cleanPages(rawPages: string[][]): string[] {
  const pages = rawPages.map((lines) => lines.map(squash).filter(Boolean));
  const repeated =
    pages.length >= MIN_PAGES_FOR_REPEATS ? findRepeatedEdges(pages) : new Set<string>();

  return pages.map((lines) => toParagraphs(dropNoise(lines, repeated)));
}
