import type { PieceTarget } from '#components/infographic/common';
import type { LibraryInfographic, LibraryInfographicInput } from '#shared/contracts/library';

/** A peça que está no lugar indicado (vazia se o lugar não existe). */
export function pieceAt(data: LibraryInfographic, target: PieceTarget): string {
  if (target.section === null) {
    return data.piece;
  }

  const section = data.sections[target.section];

  if (!section) {
    return '';
  }

  if (target.part === 'piece') {
    return section.piece;
  }

  if (target.part === 'item') {
    return section.items[target.index]?.piece ?? '';
  }

  return section.sides?.[target.index]?.piece ?? '';
}

/**
 * Uma cópia do infográfico com a peça do lugar indicado trocada (o original não muda). Lugar que
 * não existe devolve o mesmo infográfico, sem mudança.
 */
export function withPiece(
  data: LibraryInfographic,
  target: PieceTarget,
  key: string,
): LibraryInfographic {
  if (target.section === null) {
    return { ...data, piece: key };
  }

  const at = target.section;

  if (!data.sections[at]) {
    return data;
  }

  const sections = data.sections.map((section, index) => {
    if (index !== at) {
      return section;
    }

    if (target.part === 'piece') {
      return { ...section, piece: key };
    }

    if (target.part === 'item') {
      return {
        ...section,
        items: section.items.map((item, i) =>
          i === target.index ? { ...item, piece: key } : item,
        ),
      };
    }

    return {
      ...section,
      sides: section.sides?.map((side, i) => (i === target.index ? { ...side, piece: key } : side)),
    };
  });

  return { ...data, sections };
}

/** O que o servidor guarda do infográfico editado (sem o que ele mesmo cuida: modelo, data e avisos). */
export function toSaveInput(data: LibraryInfographic): LibraryInfographicInput {
  const { model, createdAt, stale, edited, ...input } = data;

  void model;
  void createdAt;
  void stale;
  void edited;

  return input;
}

/** O rascunho é diferente do que está guardado? (Só o conteúdo conta, não o modelo nem a data.) */
export function isDraftDirty(draft: LibraryInfographic, base: LibraryInfographic): boolean {
  return JSON.stringify(toSaveInput(draft)) !== JSON.stringify(toSaveInput(base));
}
