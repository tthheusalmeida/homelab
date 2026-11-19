import { createHash } from 'node:crypto';

import { MIND_MAP_LIMITS } from '../../ai/prompts/mind-map.prompt';

export interface MindMapNode {
  label: string;
  /** Frase curta do resumo sobre o termo; nem todo nó tem. */
  note?: string;
  children: MindMapNode[];
}

/** O mapa já validado: subtítulo opcional e os ramos de primeiro nível. */
export interface ParsedMindMap {
  subtitle?: string;
  nodes: MindMapNode[];
}

/** O que fica guardado de cada mapa gerado. */
export interface StoredMindMap {
  /** Resumo do texto de que o mapa saiu; mudou, o mapa está desatualizado. */
  contentHash: string;
  model: string;
  createdAt: string;
  subtitle?: string;
  nodes: MindMapNode[];
}

/** A resposta da IA não tem um mapa utilizável. */
export class InvalidMindMapError extends Error {
  constructor() {
    super('A IA não retornou um mapa mental válido.');
    this.name = 'InvalidMindMapError';
  }
}

export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/** Corta numa palavra inteira, com reticências. */
function shorten(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }

  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');

  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, '')}…`;
}

/** Tira markdown e espaços repetidos; o que não é texto vira vazio. */
function plain(value: unknown): string {
  return typeof value === 'string'
    ? value
        .replace(/[*_`~#>]+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    : '';
}

/** O termo: sem pontuação final e curto. */
function cleanLabel(value: unknown): string {
  return shorten(plain(value).replace(/[\s.;:,]+$/, ''), MIND_MAP_LIMITS.maxLabelChars);
}

/** A frase curta: vazia se repetir o rótulo. */
function cleanNote(value: unknown, label: string): string {
  const note = shorten(plain(value), MIND_MAP_LIMITS.maxNoteChars);

  return note.toLowerCase().replace(/[\s.]+$/, '') === label.toLowerCase() ? '' : note;
}

/** Extrai o JSON da resposta, mesmo se vier dentro de cercas de código ou com texto em volta. */
function parseAnswerJson(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end <= start) {
    throw new InvalidMindMapError();
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw new InvalidMindMapError();
  }
}

/**
 * Valida a resposta da IA e a deixa dentro dos limites (ramos, profundidade, total de nós e tamanho
 * do rótulo). Nó sem rótulo some; o que passa dos limites é cortado, não rejeitado. Sem nenhum nó
 * utilizável, lança `InvalidMindMapError`. Frase curta vazia ou igual ao rótulo é descartada.
 */
export function parseMindMap(answer: string): ParsedMindMap {
  const parsed = parseAnswerJson(answer) as { subtitle?: unknown; nodes?: unknown } | null;
  const { maxBranches, maxDepth, maxNodes } = MIND_MAP_LIMITS;

  let remaining = maxNodes;

  const clean = (items: unknown, depth: number, limit: number): MindMapNode[] => {
    if (!Array.isArray(items) || depth > maxDepth) {
      return [];
    }

    const result: MindMapNode[] = [];

    for (const item of items) {
      if (remaining <= 0 || result.length >= limit) {
        break;
      }

      const raw = item as { label?: unknown; note?: unknown; children?: unknown } | null;
      const label = typeof raw === 'object' && raw !== null ? cleanLabel(raw.label) : '';

      if (label === '') {
        continue;
      }

      const note = cleanNote(raw?.note, label);

      remaining -= 1;
      result.push({
        label,
        ...(note ? { note } : {}),
        children: clean(raw?.children, depth + 1, Infinity),
      });
    }

    return result;
  };

  const nodes = clean(parsed?.nodes, 1, maxBranches);

  if (nodes.length === 0) {
    throw new InvalidMindMapError();
  }

  const subtitle = shorten(plain(parsed?.subtitle), MIND_MAP_LIMITS.maxSubtitleChars);

  return { ...(subtitle ? { subtitle } : {}), nodes };
}
