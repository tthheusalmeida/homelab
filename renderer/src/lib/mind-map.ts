export interface MindMapNode {
  /** O termo: é a pista que faz lembrar. */
  label: string;
  /** Frase curta com o que o resumo diz sobre o termo; nem todo nó tem. */
  note?: string;
  children: MindMapNode[];
}

/** O que a tela desenha: o título no centro e os ramos ao redor. Todo texto é puro (o React escapa). */
export interface MindMap {
  title: string;
  /** Uma linha sob o título (do que o resumo trata). */
  subtitle?: string;
  /** Ramos de primeiro nível. */
  nodes: MindMapNode[];
  /** Quantidade de nós, sem contar o título. */
  size: number;
}

/** O mapa como a IA o devolve (ver `LibraryMindMap`). */
export interface AiMindMap {
  subtitle?: string;
  nodes: MindMapNode[];
}

/** Tamanho máximo do termo de um nó: é um lembrete, não o texto. */
export const MIND_MAP_NODE_MAX_CHARS = 60;
/** Tamanho máximo da frase curta de um nó. */
export const MIND_MAP_NOTE_MAX_CHARS = 100;
/** Termos em negrito de um parágrafo que viram nós (os primeiros). */
const MAX_TERMS_PER_PARAGRAPH = 6;
/** Itens de lista mais fundos que isso (itens dentro de itens) ficam de fora. */
const MAX_LIST_DEPTH = 2;

/** Tira a marcação inline (links, imagens, ênfase, código) e normaliza os espaços. */
function stripMarkup(raw: string): string {
  return raw
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Corta na última palavra inteira que cabe, com reticências. */
function shorten(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }

  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut;

  return `${base.replace(/[\s,;:.\-–—]+$/, '')}…`;
}

const LEADING_BOLD = /^\s*(?:\*\*|__)(.+?)(?:\*\*|__)/;
const LEADING_TERM = /^([^:]{2,45}):(?:\s|$)/;
const CLAUSE_END = /(?<=\S)(?:[.;!?](?:\s|$)|\s[—–-]\s)/;

/**
 * Separa um item em termo e frase curta: o negrito do começo (`**Termo**: explicação`), ou o que
 * vem antes de ":" (só se o ":" for seguido de espaço, para não cortar endereços e horas), ou a
 * primeira frase ou oração. O que sobra vira a frase curta.
 */
export function splitItem(raw: string): { label: string; note?: string } {
  const noteOf = (rest: string) => {
    const text = shorten(stripMarkup(rest).replace(/^[\s:：\-–—.]+/, ''), MIND_MAP_NOTE_MAX_CHARS);

    return text === '' ? {} : { note: text };
  };

  const bold = raw.match(LEADING_BOLD);

  if (bold) {
    const label = stripMarkup(bold[1]).replace(/[:\s]+$/, '');

    if (label !== '') {
      return {
        label: shorten(label, MIND_MAP_NODE_MAX_CHARS),
        ...noteOf(raw.slice(bold[0].length)),
      };
    }
  }

  const text = stripMarkup(raw);
  const term = text.match(LEADING_TERM);

  if (term) {
    return {
      label: shorten(term[1].trim(), MIND_MAP_NODE_MAX_CHARS),
      ...noteOf(text.slice(term[0].length)),
    };
  }

  const end = text.search(CLAUSE_END);

  if (end > 0) {
    const rest = text.slice(end).replace(/^[.;!?]\s*|^\s[—–-]\s/, '');

    return { label: shorten(text.slice(0, end).trim(), MIND_MAP_NODE_MAX_CHARS), ...noteOf(rest) };
  }

  return { label: shorten(text, MIND_MAP_NODE_MAX_CHARS) };
}

/** Termos em negrito de um texto, sem repetir. */
function boldTerms(raw: string): string[] {
  const terms = new Set<string>();

  for (const match of raw.matchAll(/(?:\*\*|__)(.+?)(?:\*\*|__)/g)) {
    const term = stripMarkup(match[1]).replace(/[:\s]+$/, '');

    if (term !== '') {
      terms.add(shorten(term, MIND_MAP_NODE_MAX_CHARS));
    }
  }

  return [...terms].slice(0, MAX_TERMS_PER_PARAGRAPH);
}

const HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const LIST_ITEM = /^(\s*)(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.+)$/;
const FENCE = /^\s*(```|~~~)/;
const SKIPPED_LINE = /^\s*(\||[-*_]{3,}\s*$|!\[[^\]]*\]\([^)]*\)\s*$)/;

interface Level {
  depth: number;
  node: MindMapNode;
}

/**
 * Mapa **simples**, montado só do texto em Markdown (sem IA); é a reserva enquanto a IA gera o
 * mapa de revisão ou quando ela falha (ver `docs/mapa-mental.md`):
 * - o título da página fica no centro; cada título é um ramo e os subtítulos ficam dentro dele;
 * - cada item de lista vira termo e frase curta (`splitItem`); itens dentro de itens entram até o
 *   2º nível;
 * - um parágrafo vira os seus termos em negrito; sem negrito, a primeira frase, mas só se o título
 *   não tiver mais nada;
 * - tabelas, imagens soltas e blocos de código ficam de fora.
 * Um único `#` no texto repete o título da página e por isso não vira nó.
 */
export function buildMindMap(markdown: string, title: string): MindMap {
  const lines = markdown.split(/\r?\n/);
  const topHeadings = lines.filter((line) => /^#\s+\S/.test(line)).length;
  const skipTopHeading = topHeadings === 1;

  const top: MindMapNode = { label: '', children: [] };
  let size = 0;

  const headings: Level[] = [];
  const items: Level[] = [];
  const fallbacks: { parent: MindMapNode; node: MindMapNode }[] = [];
  let paragraph: string[] = [];
  let fence: string | null = null;

  const currentHeading = () => headings.at(-1)?.node ?? top;

  function attach(parent: MindMapNode, label: string, note?: string): MindMapNode {
    const node: MindMapNode = { label, ...(note ? { note } : {}), children: [] };

    parent.children.push(node);
    size += 1;

    return node;
  }

  function flushParagraph() {
    const raw = paragraph.join(' ');

    paragraph = [];

    if (raw.trim() === '') {
      return;
    }

    const parent = currentHeading();
    const terms = boldTerms(raw);

    if (terms.length > 0) {
      terms.forEach((term) => attach(parent, term));
      return;
    }

    // Sem negrito: a primeira frase serve só se o título ficar sem nada melhor (ver o fim).
    fallbacks.push({ parent, node: attach(parent, splitItem(raw).label) });
  }

  for (const line of lines) {
    const fenceMatch = line.match(FENCE);

    if (fenceMatch) {
      flushParagraph();
      fence = fence === null ? fenceMatch[1] : fence === fenceMatch[1] ? null : fence;
      continue;
    }

    if (fence !== null) {
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    const heading = line.match(HEADING);

    if (heading) {
      flushParagraph();
      items.length = 0;

      const depth = heading[1].length;
      const text = shorten(stripMarkup(heading[2]), MIND_MAP_NODE_MAX_CHARS);

      if (text === '') {
        continue;
      }

      if (depth === 1 && skipTopHeading) {
        headings.length = 0;
        continue;
      }

      while (headings.length > 0 && headings[headings.length - 1].depth >= depth) {
        headings.pop();
      }

      headings.push({ depth, node: attach(currentHeading(), text) });
      continue;
    }

    const item = line.match(LIST_ITEM);

    if (item) {
      flushParagraph();

      const { label, note } = splitItem(item[2]);

      if (label === '') {
        continue;
      }

      const indent = item[1].replace(/\t/g, '    ').length;

      while (items.length > 0 && items[items.length - 1].depth >= indent) {
        items.pop();
      }

      if (items.length >= MAX_LIST_DEPTH) {
        continue;
      }

      const parent = items.at(-1)?.node ?? currentHeading();

      items.push({ depth: indent, node: attach(parent, label, note) });
      continue;
    }

    if (SKIPPED_LINE.test(line)) {
      flushParagraph();
      continue;
    }

    items.length = 0;
    paragraph.push(line.replace(/^\s*>\s?/, ''));
  }

  flushParagraph();

  const fallbackNodes = new Set(fallbacks.map(({ node }) => node));

  for (const { parent, node } of fallbacks) {
    if (parent.children.some((child) => !fallbackNodes.has(child))) {
      parent.children.splice(parent.children.indexOf(node), 1);
      size -= 1;
    }
  }

  return {
    title: shorten(stripMarkup(title), MIND_MAP_NODE_MAX_CHARS * 2) || 'Sem título',
    nodes: top.children,
    size,
  };
}

/** O mapa que a IA gerou, no formato que a tela desenha. */
export function fromAiMap(title: string, map: AiMindMap): MindMap {
  const count = (nodes: MindMapNode[]): number =>
    nodes.reduce((sum, node) => sum + 1 + count(node.children), 0);

  return {
    title: shorten(stripMarkup(title), MIND_MAP_NODE_MAX_CHARS * 2) || 'Sem título',
    ...(map.subtitle ? { subtitle: map.subtitle } : {}),
    nodes: map.nodes,
    size: count(map.nodes),
  };
}
