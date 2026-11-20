import { normalizeKey } from '#lib/text';

import type { CategoryNode } from './types/library.types';

/** Máximo de níveis de uma categoria (pastas dentro de pastas). */
export const MAX_CATEGORY_LEVELS = 4;

const sameKeys = (a: string[], b: string[]) =>
  a.length === b.length && a.every((name, level) => normalizeKey(name) === normalizeKey(b[level]));

/** `prefix` é o começo de `path` (ou ele inteiro), sem diferenciar maiúscula, acento e espaços? */
export function startsWithPath(path: string[], prefix: string[]): boolean {
  return (
    path.length >= prefix.length &&
    prefix.every((name, level) => normalizeKey(name) === normalizeKey(path[level]))
  );
}

/**
 * A categoria escolhida no filtro depois que uma categoria foi renomeada ou movida: se ela era a
 * categoria editada (ou ficava dentro dela), o filtro passa para o caminho novo, mantendo os níveis
 * de baixo; qualquer outra escolha fica como estava.
 */
export function followRenamedCategory(selected: string[], from: string[], to: string[]): string[] {
  return startsWithPath(selected, from) ? [...to, ...selected.slice(from.length)] : selected;
}

/** A categoria em `path` na árvore, ou `undefined`. Vazio é a raiz (não é uma categoria). */
export function findCategory(nodes: CategoryNode[], path: string[]): CategoryNode | undefined {
  let level = nodes;
  let found: CategoryNode | undefined;

  for (const name of path) {
    found = level.find((node) => normalizeKey(node.name) === normalizeKey(name));

    if (!found) {
      return undefined;
    }

    level = found.children;
  }

  return found;
}

/** Quantos níveis a categoria tem, contando a subcategoria mais funda dela. */
export function categoryDepth(node: CategoryNode): number {
  return 1 + Math.max(0, ...node.children.map(categoryDepth));
}

/** O caminho da categoria depois de ir para dentro de `parent` (vazio = nível principal), com o mesmo nome. */
export function pathInside(node: CategoryNode, parent: string[], name = node.name): string[] {
  return [...parent, name];
}

/**
 * A categoria pode ir para dentro de `parent` (vazio = nível principal) com o nome `name`? Não pode
 * ir para dentro dela mesma ou de uma subcategoria, nem ficar onde já está, e nenhuma subcategoria
 * pode passar de 4 níveis.
 */
export function canMoveInto(node: CategoryNode, parent: string[], name = node.name): boolean {
  const target = pathInside(node, parent, name);

  return (
    !startsWithPath(parent, node.path) &&
    !sameKeys(target, node.path) &&
    parent.length + categoryDepth(node) <= MAX_CATEGORY_LEVELS
  );
}

/** Um lugar onde a categoria pode ficar (para a lista "Dentro de"). `path` vazio é o nível principal. */
export interface CategoryPlace {
  path: string[];
  /** "Tecnologia › Containers". */
  label: string;
}

/**
 * Os lugares onde a categoria pode ficar: o nível principal e cada categoria que **não** é ela, nem
 * está dentro dela, nem deixaria alguma subcategoria passar de 4 níveis. Em ordem de árvore.
 */
export function placesFor(
  node: CategoryNode,
  tree: CategoryNode[],
  rootLabel: string,
): CategoryPlace[] {
  const places: CategoryPlace[] = [{ path: [], label: rootLabel }];

  const walk = (nodes: CategoryNode[]) => {
    for (const item of nodes) {
      if (
        !startsWithPath(item.path, node.path) &&
        item.path.length + categoryDepth(node) <= MAX_CATEGORY_LEVELS
      ) {
        places.push({ path: item.path, label: item.path.join(' › ') });
      }

      walk(item.children);
    }
  };

  walk(tree);

  return places;
}
