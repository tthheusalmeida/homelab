import type {
  LibraryInfographic,
  LibraryInfographicItem,
  LibraryInfographicSection,
  LibraryInfographicSide,
  LibraryInfographicWinner,
} from '../../../../shared/contracts/library';
import {
  INFOGRAPHIC_LIMITS,
  INFOGRAPHIC_ACCEPTED_MIN_ITEMS,
  INFOGRAPHIC_MIN_ACCEPTED_SECTIONS,
  INFOGRAPHIC_SECTIONS,
  isInfographicLayoutId,
  layoutInfo,
  type InfographicLayoutId,
} from '../../../../shared/infographic-layouts';
import { INFOGRAPHIC_PIECE_KEYS } from '../../../../shared/infographic-pieces';
import { plainText } from '../../../../shared/plain-text';
import { parseJsonObject } from '../../../utils/json-answer';

import { fillMissingPieces } from './infographic-pieces';

/** O infográfico já validado, sem os dados de geração. */
export type ParsedInfographic = Omit<LibraryInfographic, 'model' | 'createdAt' | 'stale'>;

/** O que fica guardado de cada infográfico gerado. */
export interface StoredInfographic extends ParsedInfographic {
  /** Resumo do texto de que o infográfico saiu; mudou, ele está desatualizado. */
  contentHash: string;
  model: string;
  createdAt: string;
  /** O usuário editou o infográfico à mão (trocou peças). */
  edited?: boolean;
}

/** A resposta da IA não tem um infográfico utilizável. */
export class InvalidInfographicError extends Error {
  /**
   * @param problems o que não se sustentou (uma frase por problema, ex.: "seção 2 (cycle): itens de
   * menos (3 de 4)"), para o log e para entender por que a resposta da IA foi recusada.
   */
  constructor(
    message = 'A IA não retornou um infográfico válido.',
    readonly problems: string[] = [],
  ) {
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

/** Texto limpo e dentro do limite, sem pontuação solta no fim dos rótulos. */
function text(value: unknown, max: number, label = false): string {
  const clean = plainText(value);

  return shorten(label ? clean.replace(/[\s.;:,]+$/, '') : clean, max);
}

/** Peça do catálogo; chave desconhecida vira vazia (depois `fillMissingPieces` escolhe uma pelo texto). */
function piece(value: unknown): string {
  const key = typeof value === 'string' ? value.trim() : '';

  return INFOGRAPHIC_PIECE_KEYS.has(key) ? key : '';
}

/** Chaves que só o infográfico tem: se alguma vier no objeto, ele já é o infográfico (não está embrulhado). */
const INFOGRAPHIC_KEYS = ['title', 'sections', 'items', 'layout', 'kicker'] as const;

/**
 * Extrai o JSON da resposta, mesmo com cercas de código, texto em volta, defeitos pequenos ou o fim
 * cortado (ver `parseJsonObject`). Se a IA embrulhou o infográfico em uma chave só
 * (`{"infographic": {...}}`), desembrulha.
 */
function parseAnswerJson(answer: string): Record<string, unknown> {
  let parsed = parseJsonObject(answer);

  while (parsed && !INFOGRAPHIC_KEYS.some((key) => key in parsed!)) {
    const values = Object.values(parsed);
    const only = values.length === 1 ? values[0] : null;

    if (typeof only !== 'object' || only === null || Array.isArray(only)) {
      break;
    }

    parsed = only as Record<string, unknown>;
  }

  if (!parsed) {
    throw new InvalidInfographicError(undefined, ['a resposta não tem um JSON utilizável']);
  }

  return parsed;
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
 * sem título, com itens abaixo do mínimo aceito (`INFOGRAPHIC_ACCEPTED_MIN_ITEMS`), ou comparativo sem os dois lados) é descartada: `null`.
 */
function parseSection(
  raw: unknown,
  forcedLayout?: InfographicLayoutId,
  problems: string[] = [],
  position = 1,
): LibraryInfographicSection | null {
  const drop = (why: string): null => {
    problems.push(`seção ${position}: ${why}`);

    return null;
  };

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return drop('não é um objeto');
  }

  const source = raw as Record<string, unknown>;
  const layout = forcedLayout ?? (isInfographicLayoutId(source.layout) ? source.layout : null);

  if (!layout) {
    return drop(
      `modelo desconhecido (${typeof source.layout === 'string' ? source.layout : 'sem "layout"'})`,
    );
  }

  const info = layoutInfo(layout);
  const title = text(source.title, INFOGRAPHIC_LIMITS.maxTitleChars, true);
  const items = (Array.isArray(source.items) ? source.items : [])
    .map((entry) => cleanItem(entry, layout))
    .filter((item): item is LibraryInfographicItem => item !== null)
    .slice(0, info.maxItems);

  if (title === '') {
    return drop(`modelo ${layout} sem título`);
  }

  const acceptedMin = INFOGRAPHIC_ACCEPTED_MIN_ITEMS[layout];

  if (items.length < acceptedMin) {
    return drop(`modelo ${layout} com itens de menos (${items.length} de ${acceptedMin})`);
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
      return drop('comparativo sem os dois lados');
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
 * solta, sem a lista). Sem título (nem o da página, que serve de reserva) ou com seções de menos (no modo livre, ao menos duas, para ser
 * uma história), lança `InvalidInfographicError`.
 */
export function parseInfographic(
  answer: string,
  forcedLayout?: InfographicLayoutId,
  fallbackTitle?: string,
): ParsedInfographic {
  const source = parseAnswerJson(answer);
  // A IA às vezes esquece o título da capa: o da página serve (é o assunto do infográfico).
  const title =
    text(source.title, INFOGRAPHIC_LIMITS.maxTitleChars, true) ||
    text(fallbackTitle, INFOGRAPHIC_LIMITS.maxTitleChars, true);
  const rawSections = Array.isArray(source.sections) ? source.sections : [source];
  const problems: string[] = [];
  const sections = rawSections
    .map((entry, index) => parseSection(entry, forcedLayout, problems, index + 1))
    .filter((section): section is LibraryInfographicSection => section !== null)
    .slice(0, forcedLayout ? 1 : INFOGRAPHIC_SECTIONS.max);
  const needed = forcedLayout ? 1 : INFOGRAPHIC_MIN_ACCEPTED_SECTIONS;

  if (title === '') {
    problems.unshift('a capa não tem título');
  }

  if (!Array.isArray(source.sections)) {
    problems.push('a resposta não tem a lista "sections"');
  }

  if (title === '' || sections.length < needed) {
    problems.push(
      `${sections.length} seção(ões) utilizável(is) de ${rawSections.length} (mínimo ${needed})`,
    );
    throw new InvalidInfographicError(undefined, problems);
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
