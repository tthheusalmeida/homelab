import { compareNatural, normalizeKey } from './naming';

export interface CategoryNode {
  name: string;
  /** Caminho completo até este nível. */
  path: string[];
  /** Documentos neste nível e abaixo dele. */
  count: number;
  children: CategoryNode[];
}

/**
 * Monta a árvore de categorias a partir dos caminhos dos documentos.
 * Níveis com o mesmo nome (ignorando maiúscula e acento) são unidos; a
 * ordem é alfanumérica natural em cada nível.
 */
export function buildCategoryTree(categories: string[][], empty: string[][] = []): CategoryNode[] {
  const roots: CategoryNode[] = [];

  /** Acha ou cria cada nível do caminho; `counted` soma um documento em cada nível. */
  const place = (category: string[], counted: boolean) => {
    let level = roots;

    category.forEach((name, depth) => {
      const key = normalizeKey(name);
      let node = level.find((item) => normalizeKey(item.name) === key);

      if (!node) {
        node = {
          name,
          path: category.slice(0, depth + 1),
          count: 0,
          children: [],
        };
        level.push(node);
      }

      if (counted) {
        node.count += 1;
      }

      level = node.children;
    });
  };

  for (const category of categories) {
    place(category, true);
  }

  // Pastas de categoria que existem sem nenhum documento (ou só com documentos fora da lista):
  // aparecem na árvore com contagem zero.
  for (const category of empty) {
    place(category, false);
  }

  const sort = (nodes: CategoryNode[]): CategoryNode[] => {
    nodes.sort((a, b) => compareNatural(a.name, b.name));
    nodes.forEach((node) => sort(node.children));

    return nodes;
  };

  return sort(roots);
}

/** Verdadeiro se `category` começa com todos os níveis de `prefix`. */
export function startsWithCategory(category: string[], prefix: string[]): boolean {
  return (
    prefix.length <= category.length &&
    prefix.every((name, i) => normalizeKey(name) === normalizeKey(category[i]))
  );
}
