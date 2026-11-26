import { createHash } from 'node:crypto';

import { MIND_MAP_EDIT_LIMITS, type MindMapLimits } from '../../../../shared/mind-map-limits';
import { plainText } from '../../../../shared/plain-text';
import { parseJsonObject } from '../../../utils/json-answer';
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
  /** O usuário editou o mapa à mão: gerar de novo com a IA apagaria as edições. */
  edited?: boolean;
  subtitle?: string;
  nodes: MindMapNode[];
}

/** O mapa (da IA ou enviado pelo usuário) não tem nada utilizável. */
export class InvalidMindMapError extends Error {
  constructor(message = 'A IA não retornou um mapa mental válido.') {
    super(message);
    this.name = 'InvalidMindMapError';
  }
}

export const MindMapEditMessages = {
  empty: 'O mapa precisa ter pelo menos um ramo com texto.',
  notAMap: 'O mapa enviado não é válido.',
} as const;

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

/** O que cada jeito de limpar o texto faz: a IA é limpa de markdown; o que o usuário digita fica como está. */
interface Cleaner {
  limits: MindMapLimits;
  /** `true`: só junta espaços e apara (o usuário pode querer `*`, `_`, ponto final...). */
  asTyped: boolean;
}

function cleanText(value: unknown, cleaner: Cleaner): string {
  return cleaner.asTyped
    ? typeof value === 'string'
      ? value.replace(/\s+/g, ' ').trim()
      : ''
    : plainText(value);
}

/** O termo: curto (e, vindo da IA, sem pontuação final). */
function cleanLabel(value: unknown, cleaner: Cleaner): string {
  const text = cleanText(value, cleaner);

  return shorten(
    cleaner.asTyped ? text : text.replace(/[\s.;:,]+$/, ''),
    cleaner.limits.maxLabelChars,
  );
}

/** A frase curta: vazia se repetir o rótulo. */
function cleanNote(value: unknown, label: string, cleaner: Cleaner): string {
  const note = shorten(cleanText(value, cleaner), cleaner.limits.maxNoteChars);

  return note.toLowerCase().replace(/[\s.]+$/, '') === label.toLowerCase() ? '' : note;
}

/**
 * Extrai o JSON da resposta, mesmo com cercas de código, texto em volta, defeitos pequenos ou o fim
 * cortado (ver `parseJsonObject`). Se a IA embrulhou o mapa em uma chave só (`{"mapa": {...}}`),
 * desembrulha.
 */
function parseAnswerJson(text: string): unknown {
  let parsed = parseJsonObject(text);

  while (
    parsed &&
    !('nodes' in parsed) &&
    Object.keys(parsed).length === 1 &&
    typeof Object.values(parsed)[0] === 'object' &&
    Object.values(parsed)[0] !== null &&
    !Array.isArray(Object.values(parsed)[0])
  ) {
    parsed = Object.values(parsed)[0] as Record<string, unknown>;
  }

  if (!parsed) {
    throw new InvalidMindMapError();
  }

  return parsed;
}

/**
 * Deixa um mapa dentro dos limites (ramos, profundidade, total de nós e tamanho dos textos). Nó sem
 * rótulo some; o que passa dos limites é cortado, não rejeitado. Sem nenhum nó utilizável, lança
 * `InvalidMindMapError` com `emptyMessage`. Frase curta vazia ou igual ao rótulo é descartada.
 */
function normalizeMindMap(
  parsed: { subtitle?: unknown; nodes?: unknown } | null,
  cleaner: Cleaner,
  emptyMessage?: string,
): ParsedMindMap {
  const { maxBranches, maxDepth, maxNodes, maxSubtitleChars } = cleaner.limits;

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
      const label = typeof raw === 'object' && raw !== null ? cleanLabel(raw.label, cleaner) : '';

      if (label === '') {
        continue;
      }

      const note = cleanNote(raw?.note, label, cleaner);

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
    throw new InvalidMindMapError(emptyMessage);
  }

  const subtitle = shorten(cleanText(parsed?.subtitle, cleaner), maxSubtitleChars);

  return { ...(subtitle ? { subtitle } : {}), nodes };
}

/** Valida a resposta da IA (texto com um JSON) e a deixa dentro dos limites da IA. */
export function parseMindMap(answer: string): ParsedMindMap {
  return normalizeMindMap(
    parseAnswerJson(answer) as { subtitle?: unknown; nodes?: unknown } | null,
    { limits: MIND_MAP_LIMITS, asTyped: false },
  );
}

/**
 * Valida o mapa que o **usuário editou** (objeto vindo da tela) e o deixa dentro dos limites de
 * edição, mantendo o texto como foi digitado. Sem nenhum ramo com texto, lança `InvalidMindMapError`.
 */
export function parseEditedMindMap(input: unknown): ParsedMindMap {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new InvalidMindMapError(MindMapEditMessages.notAMap);
  }

  return normalizeMindMap(
    input,
    { limits: MIND_MAP_EDIT_LIMITS, asTyped: true },
    MindMapEditMessages.empty,
  );
}
