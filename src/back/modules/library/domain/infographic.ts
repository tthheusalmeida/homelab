import type {
  LibraryInfographic,
  LibraryInfographicItem,
  LibraryInfographicSection,
  LibraryInfographicSide,
  LibraryInfographicWinner,
} from '../../../../shared/contracts/library';
import {
  INFOGRAPHIC_LIMITS,
  INFOGRAPHIC_SECTIONS,
  isInfographicLayoutId,
  layoutInfo,
  type InfographicLayoutId,
} from '../../../../shared/infographic-layouts';
import { INFOGRAPHIC_PIECE_KEYS } from '../../../../shared/infographic-pieces';

import { fillMissingPieces } from './infographic-pieces';

/** O infográfico já validado, sem os dados de geração. */
export type ParsedInfographic = Omit<LibraryInfographic, 'model' | 'createdAt' | 'stale'>;

/** O que fica guardado de cada infográfico gerado. */
export interface StoredInfographic extends ParsedInfographic {
  /** Resumo do texto de que o infográfico saiu; mudou, ele está desatualizado. */
  contentHash: string;
  model: string;
  createdAt: string;
}

/** A resposta da IA não tem um infográfico utilizável. */
export class InvalidInfographicError extends Error {
  constructor(message = 'A IA não retornou um infográfico válido.') {
    super(message);
    this.name = 'InvalidInfographicError';
  }
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

/** Texto limpo e dentro do limite, sem pontuação solta no fim dos rótulos. */
function text(value: unknown, max: number, label = false): string {
  const clean = plain(value);

  return shorten(label ? clean.replace(/[\s.;:,]+$/, '') : clean, max);
}

/** Peça do catálogo; chave desconhecida vira vazia (depois `fillMissingPieces` escolhe uma pelo texto). */
function piece(value: unknown): string {
  const key = typeof value === 'string' ? value.trim() : '';

  return INFOGRAPHIC_PIECE_KEYS.has(key) ? key : '';
}

/** Extrai o JSON da resposta, mesmo dentro de cercas de código ou com texto em volta. */
function parseAnswerJson(answer: string): Record<string, unknown> {
  const start = answer.indexOf('{');
  const end = answer.lastIndexOf('}');

  if (start === -1 || end <= start) {
    throw new InvalidInfographicError();
  }

  try {
    const parsed: unknown = JSON.parse(answer.slice(start, end + 1));

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new InvalidInfographicError();
    }

    return parsed as Record<string, unknown>;
  } catch (error) {
    throw error instanceof InvalidInfographicError ? error : new InvalidInfographicError();
  }
}

const WINNERS: readonly LibraryInfographicWinner[] = ['a', 'b', 'tie'];

function cleanItem(raw: unknown, layout: InfographicLayoutId): LibraryInfographicItem | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const title = text(source.title, INFOGRAPHIC_LIMITS.maxItemTitleChars, true);
  const body = text(source.text, INFOGRAPHIC_LIMITS.maxItemTextChars);
  const tag = text(source.tag, INFOGRAPHIC_LIMITS.maxTagChars, true);
  const extra = text(source.extra, INFOGRAPHIC_LIMITS.maxItemTextChars);

  // Sem título (e, nos números, sem valor), o espaço não diz nada: some.
  if (title === '' && !(layout === 'numbers' && tag !== '')) {
    return null;
  }

  const item: LibraryInfographicItem = { piece: piece(source.piece), title, text: body };

  if (tag !== '') {
    item.tag = tag;
  }

  if (layout === 'versus') {
    item.extra = extra;

    const winner = typeof source.winner === 'string' ? source.winner.toLowerCase() : '';

    if ((WINNERS as readonly string[]).includes(winner)) {
      item.winner = winner as LibraryInfographicWinner;
    }
  }

  if (layout === 'ranking') {
    const value = Number(source.value);

    item.value = Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 50;
  }

  return item;
}

function cleanSides(raw: unknown): LibraryInfographicSide[] | null {
  if (!Array.isArray(raw)) {
    return null;
  }

  const sides = raw
    .map((side): LibraryInfographicSide | null => {
      if (typeof side !== 'object' || side === null) {
        return null;
      }

      const source = side as Record<string, unknown>;
      const title = text(source.title, INFOGRAPHIC_LIMITS.maxItemTitleChars, true);

      return title === '' ? null : { piece: piece(source.piece), title };
    })
    .filter((side): side is LibraryInfographicSide => side !== null);

  return sides.length >= 2 ? sides.slice(0, 2) : null;
}

function cleanTexts(value: unknown, maxItems: number, maxChars: number): string[] {
  return (Array.isArray(value) ? value : [])
    .map((entry) => text(entry, maxChars))
    .filter((entry) => entry !== '')
    .slice(0, maxItems);
}

/**
 * Uma seção do infográfico: modelo (o do usuário, se houver), título, itens dentro do mínimo e do
 * máximo do modelo e os campos que o modelo usa. Seção que não se sustenta (sem modelo conhecido,
 * sem título, com itens de menos, ou comparativo sem os dois lados) é descartada: `null`.
 */
function parseSection(
  raw: unknown,
  forcedLayout?: InfographicLayoutId,
): LibraryInfographicSection | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }

  const source = raw as Record<string, unknown>;
  const layout = forcedLayout ?? (isInfographicLayoutId(source.layout) ? source.layout : null);

  if (!layout) {
    return null;
  }

  const info = layoutInfo(layout);
  const title = text(source.title, INFOGRAPHIC_LIMITS.maxTitleChars, true);
  const items = (Array.isArray(source.items) ? source.items : [])
    .map((entry) => cleanItem(entry, layout))
    .filter((item): item is LibraryInfographicItem => item !== null)
    .slice(0, info.maxItems);

  if (title === '' || items.length < info.minItems) {
    return null;
  }

  const section: LibraryInfographicSection = { layout, title, piece: piece(source.piece), items };
  const subtitle = text(source.subtitle, INFOGRAPHIC_LIMITS.maxSubtitleChars);
  const note = text(source.note, INFOGRAPHIC_LIMITS.maxNoteChars);
  const meterLabel = text(source.meterLabel, INFOGRAPHIC_LIMITS.maxMeterLabelChars, true);
  const tips = cleanTexts(source.tips, INFOGRAPHIC_LIMITS.maxTips, INFOGRAPHIC_LIMITS.maxTipChars);

  if (subtitle) section.subtitle = subtitle;
  if (note) section.note = note;
  if (tips.length > 0) section.tips = tips;
  if (layout === 'ranking' && meterLabel) section.meterLabel = meterLabel;

  if (layout === 'versus') {
    const sides = cleanSides(source.sides);

    if (!sides) {
      return null;
    }

    section.sides = sides;
  }

  return section;
}

/**
 * Valida a resposta da IA (texto com um JSON) e a deixa dentro dos limites: capa (título, subtítulo,
 * abertura, peça), seções (cada uma no seu modelo) e fechamento. Textos são cortados, peças
 * desconhecidas viram vazias e seções que não se sustentam somem. Com `forcedLayout` (escolha do
 * usuário) o infográfico tem **uma** seção, nesse modelo (a IA pode ter respondido com a seção
 * solta, sem a lista). Sem título ou com seções de menos (no modo livre, ao menos duas, para ser
 * uma história), lança `InvalidInfographicError`.
 */
export function parseInfographic(
  answer: string,
  forcedLayout?: InfographicLayoutId,
): ParsedInfographic {
  const source = parseAnswerJson(answer);
  const title = text(source.title, INFOGRAPHIC_LIMITS.maxTitleChars, true);
  const rawSections = Array.isArray(source.sections) ? source.sections : [source];
  const sections = rawSections
    .map((entry) => parseSection(entry, forcedLayout))
    .filter((section): section is LibraryInfographicSection => section !== null)
    .slice(0, forcedLayout ? 1 : INFOGRAPHIC_SECTIONS.max);
  const needed = forcedLayout ? 1 : INFOGRAPHIC_SECTIONS.min;

  if (title === '' || sections.length < needed) {
    throw new InvalidInfographicError();
  }

  const result: ParsedInfographic = { title, piece: piece(source.piece), sections };
  const kicker = text(source.kicker, INFOGRAPHIC_LIMITS.maxKickerChars, true);
  const subtitle = text(source.subtitle, INFOGRAPHIC_LIMITS.maxSubtitleChars);
  const intro = text(source.intro, INFOGRAPHIC_LIMITS.maxIntroChars);
  const takeaways = cleanTexts(
    source.takeaways,
    INFOGRAPHIC_LIMITS.maxTakeaways,
    INFOGRAPHIC_LIMITS.maxTakeawayChars,
  );

  if (kicker) result.kicker = kicker;
  if (subtitle) result.subtitle = subtitle;
  if (intro) result.intro = intro;
  if (takeaways.length > 0) result.takeaways = takeaways;

  // A IA às vezes erra ou esquece a chave de uma peça: o espaço ganha a peça que combina com o texto.
  return fillMissingPieces(result);
}
