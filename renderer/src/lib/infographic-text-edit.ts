import type { LibraryInfographic, LibraryInfographicSection } from '#shared/contracts/library';
import { INFOGRAPHIC_LIMITS } from '#shared/infographic-layouts';

/** Qual texto do infográfico: os da capa e do fechamento, os da seção e os de cada item. */
export type TextKind =
  | 'kicker'
  | 'title'
  | 'subtitle'
  | 'intro'
  | 'note'
  | 'meterLabel'
  | 'item.title'
  | 'item.text'
  | 'item.tag'
  | 'item.extra'
  | 'side.title'
  | 'tip'
  | 'takeaway';

/**
 * Onde um texto mora: na capa e no fechamento (`section: null`) ou em uma seção. `index` é o item,
 * o lado do comparativo, a dica ou a frase para lembrar, conforme o tipo.
 */
export interface TextTarget {
  section: number | null;
  kind: TextKind;
  index?: number;
}

/** Como o texto de cada tipo é editado: o nome do campo, o limite, se tem várias linhas e se é obrigatório. */
export interface TextField {
  label: string;
  max: number;
  multiline: boolean;
  required: boolean;
}

const L = INFOGRAPHIC_LIMITS;

const FIELDS: Record<TextKind, TextField> = {
  kicker: { label: 'Assunto', max: L.maxKickerChars, multiline: false, required: false },
  title: { label: 'Título', max: L.maxTitleChars, multiline: false, required: true },
  subtitle: { label: 'Subtítulo', max: L.maxSubtitleChars, multiline: true, required: false },
  intro: { label: 'Abertura', max: L.maxIntroChars, multiline: true, required: false },
  note: { label: 'Observação', max: L.maxNoteChars, multiline: true, required: false },
  meterLabel: {
    label: 'O que o valor mede',
    max: L.maxMeterLabelChars,
    multiline: false,
    required: false,
  },
  'item.title': {
    label: 'Título do item',
    max: L.maxItemTitleChars,
    multiline: false,
    required: true,
  },
  'item.text': { label: 'Texto do item', max: L.maxItemTextChars, multiline: true, required: true },
  'item.tag': {
    label: 'Destaque (número ou data)',
    max: L.maxTagChars,
    multiline: false,
    required: false,
  },
  'item.extra': {
    label: 'Texto do segundo lado',
    max: L.maxItemTextChars,
    multiline: true,
    required: false,
  },
  'side.title': {
    label: 'Nome do lado',
    max: L.maxItemTitleChars,
    multiline: false,
    required: true,
  },
  tip: { label: 'Dica', max: L.maxTipChars, multiline: false, required: true },
  takeaway: {
    label: 'Frase para lembrar',
    max: L.maxTakeawayChars,
    multiline: false,
    required: true,
  },
};

/** Como editar o texto deste tipo (nome do campo, limite, linhas e obrigatoriedade). */
export const textField = (kind: TextKind): TextField => FIELDS[kind];

const sectionOf = (data: LibraryInfographic, target: TextTarget) =>
  target.section === null ? undefined : data.sections[target.section];

/** O texto que está no lugar indicado (vazio se o lugar não existe). */
export function textAt(data: LibraryInfographic, target: TextTarget): string {
  const index = target.index ?? 0;

  if (target.section === null) {
    switch (target.kind) {
      case 'kicker':
        return data.kicker ?? '';
      case 'title':
        return data.title;
      case 'subtitle':
        return data.subtitle ?? '';
      case 'intro':
        return data.intro ?? '';
      case 'takeaway':
        return data.takeaways?.[index] ?? '';
      default:
        return '';
    }
  }

  const section = sectionOf(data, target);

  if (!section) {
    return '';
  }

  switch (target.kind) {
    case 'title':
      return section.title;
    case 'subtitle':
      return section.subtitle ?? '';
    case 'note':
      return section.note ?? '';
    case 'meterLabel':
      return section.meterLabel ?? '';
    case 'item.title':
      return section.items[index]?.title ?? '';
    case 'item.text':
      return section.items[index]?.text ?? '';
    case 'item.tag':
      return section.items[index]?.tag ?? '';
    case 'item.extra':
      return section.items[index]?.extra ?? '';
    case 'side.title':
      return section.sides?.[index]?.title ?? '';
    case 'tip':
      return section.tips?.[index] ?? '';
    default:
      return '';
  }
}

/** Troca um campo opcional; o texto vazio tira o campo (não deixa "" guardado). */
function setOptional<T extends object>(source: T, key: keyof T, value: string): T {
  const next = { ...source };

  if (value === '') {
    delete next[key];
  } else {
    (next as Record<keyof T, unknown>)[key] = value;
  }

  return next;
}

const replaceAt = <T>(list: T[] | undefined, index: number, value: T): T[] | undefined =>
  list?.map((entry, i) => (i === index ? value : entry));

/**
 * Uma cópia do infográfico com o texto do lugar indicado trocado (o original não muda). Texto de
 * campo opcional deixado em branco tira o campo. Lugar que não existe devolve o mesmo infográfico.
 */
export function withText(
  data: LibraryInfographic,
  target: TextTarget,
  value: string,
): LibraryInfographic {
  const index = target.index ?? 0;

  if (target.section === null) {
    switch (target.kind) {
      case 'kicker':
        return setOptional(data, 'kicker', value);
      case 'title':
        return { ...data, title: value };
      case 'subtitle':
        return setOptional(data, 'subtitle', value);
      case 'intro':
        return setOptional(data, 'intro', value);
      case 'takeaway':
        return data.takeaways?.[index] === undefined
          ? data
          : { ...data, takeaways: replaceAt(data.takeaways, index, value) };
      default:
        return data;
    }
  }

  const at = target.section;
  const current = data.sections[at];

  if (!current) {
    return data;
  }

  const change = (next: LibraryInfographicSection): LibraryInfographic => ({
    ...data,
    sections: data.sections.map((section, i) => (i === at ? next : section)),
  });
  const item = (
    patch: (
      entry: LibraryInfographicSection['items'][number],
    ) => LibraryInfographicSection['items'][number],
  ) =>
    current.items[index]
      ? change({
          ...current,
          items: current.items.map((entry, i) => (i === index ? patch(entry) : entry)),
        })
      : data;

  switch (target.kind) {
    case 'title':
      return change({ ...current, title: value });
    case 'subtitle':
      return change(setOptional(current, 'subtitle', value));
    case 'note':
      return change(setOptional(current, 'note', value));
    case 'meterLabel':
      return change(setOptional(current, 'meterLabel', value));
    case 'item.title':
      return item((entry) => ({ ...entry, title: value }));
    case 'item.text':
      return item((entry) => ({ ...entry, text: value }));
    case 'item.tag':
      return item((entry) => setOptional(entry, 'tag', value));
    case 'item.extra':
      return item((entry) => setOptional(entry, 'extra', value));
    case 'side.title':
      return current.sides?.[index]
        ? change({
            ...current,
            sides: replaceAt(current.sides, index, { ...current.sides[index], title: value }),
          })
        : data;
    case 'tip':
      return current.tips?.[index] === undefined
        ? data
        : change({ ...current, tips: replaceAt(current.tips, index, value) });
    default:
      return data;
  }
}
