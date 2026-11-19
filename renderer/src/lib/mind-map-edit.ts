import { MIND_MAP_EDIT_LIMITS } from '#shared/mind-map-limits';

import type { MindMap, MindMapNode } from './mind-map';

/** O mapa enquanto o usuário o edita (ainda não guardado). */
export interface MindMapDraft {
  /** Texto sob o título (vazio = sem subtítulo). */
  subtitle: string;
  nodes: MindMapNode[];
}

/** Posição de um nó na árvore: `[2]` é o 3º ramo, `[2, 0]` o 1º filho dele. */
export type NodePath = readonly number[];

/** O que impede de salvar o rascunho. */
export type DraftProblem = 'no-branches' | 'empty-label';

/** Chave de texto de um caminho (`"2.0"`), para guardar onde o foco deve ir. */
export const pathKey = (path: NodePath): string => path.join('.');

/** Cópia do mapa que está na tela, para o usuário editar sem mexer no original. */
export function draftFromMap(map: MindMap): MindMapDraft {
  const clone = (nodes: MindMapNode[]): MindMapNode[] =>
    nodes.map((node) => ({
      label: node.label,
      ...(node.note === undefined ? {} : { note: node.note }),
      children: clone(node.children),
    }));

  return { subtitle: map.subtitle ?? '', nodes: clone(map.nodes) };
}

export function countNodes(nodes: MindMapNode[]): number {
  return nodes.reduce((sum, node) => sum + 1 + countNodes(node.children), 0);
}

/** Troca o que está em `path` (e só isso) por `change(nó)`; o resto é reaproveitado. */
function replaceAt(
  nodes: MindMapNode[],
  path: NodePath,
  change: (node: MindMapNode) => MindMapNode | null,
): MindMapNode[] {
  const [index, ...rest] = path;

  if (index === undefined || index < 0 || index >= nodes.length) {
    return nodes;
  }

  const result: MindMapNode[] = [];

  nodes.forEach((node, position) => {
    if (position !== index) {
      result.push(node);
      return;
    }

    if (rest.length === 0) {
      const changed = change(node);

      if (changed) {
        result.push(changed);
      }

      return;
    }

    result.push({ ...node, children: replaceAt(node.children, rest, change) });
  });

  return result;
}

export function getNode(nodes: MindMapNode[], path: NodePath): MindMapNode | undefined {
  const [index, ...rest] = path;
  const node = index === undefined ? undefined : nodes[index];

  return rest.length === 0 || !node ? node : getNode(node.children, rest);
}

export function setSubtitle(draft: MindMapDraft, subtitle: string): MindMapDraft {
  return { ...draft, subtitle };
}

/** Muda o termo e/ou a frase curta de um nó. */
export function updateNode(
  draft: MindMapDraft,
  path: NodePath,
  patch: { label?: string; note?: string },
): MindMapDraft {
  return {
    ...draft,
    nodes: replaceAt(draft.nodes, path, (node) => ({ ...node, ...patch })),
  };
}

export function canAddBranch(draft: MindMapDraft): boolean {
  return (
    draft.nodes.length < MIND_MAP_EDIT_LIMITS.maxBranches &&
    countNodes(draft.nodes) < MIND_MAP_EDIT_LIMITS.maxNodes
  );
}

/** Cabe mais um filho no nó (profundidade e total de nós dentro dos limites)? */
export function canAddChild(draft: MindMapDraft, path: NodePath): boolean {
  return (
    path.length + 1 <= MIND_MAP_EDIT_LIMITS.maxDepth &&
    countNodes(draft.nodes) < MIND_MAP_EDIT_LIMITS.maxNodes &&
    getNode(draft.nodes, path) !== undefined
  );
}

const emptyNode = (): MindMapNode => ({ label: '', children: [] });

/** Acrescenta um ramo vazio no fim. Devolve o rascunho (igual, se não couber) e o caminho do novo. */
export function addBranch(draft: MindMapDraft): { draft: MindMapDraft; path: NodePath | null } {
  if (!canAddBranch(draft)) {
    return { draft, path: null };
  }

  return {
    draft: { ...draft, nodes: [...draft.nodes, emptyNode()] },
    path: [draft.nodes.length],
  };
}

/** Acrescenta um filho vazio no fim do nó. Devolve o rascunho (igual, se não couber) e o caminho do novo. */
export function addChild(
  draft: MindMapDraft,
  path: NodePath,
): { draft: MindMapDraft; path: NodePath | null } {
  const parent = getNode(draft.nodes, path);

  if (!parent || !canAddChild(draft, path)) {
    return { draft, path: null };
  }

  return {
    draft: {
      ...draft,
      nodes: replaceAt(draft.nodes, path, (node) => ({
        ...node,
        children: [...node.children, emptyNode()],
      })),
    },
    path: [...path, parent.children.length],
  };
}

/** Apaga o nó **e tudo o que está dentro dele**. */
export function removeNode(draft: MindMapDraft, path: NodePath): MindMapDraft {
  return { ...draft, nodes: replaceAt(draft.nodes, path, () => null) };
}

/** Quantos nós sairiam junto ao apagar este (ele e seus descendentes). */
export function subtreeSize(draft: MindMapDraft, path: NodePath): number {
  const node = getNode(draft.nodes, path);

  return node ? 1 + countNodes(node.children) : 0;
}

/** O que impede de salvar, ou `null` se está tudo certo. */
export function validateDraft(draft: MindMapDraft): DraftProblem | null {
  if (draft.nodes.length === 0) {
    return 'no-branches';
  }

  const hasEmpty = (nodes: MindMapNode[]): boolean =>
    nodes.some((node) => node.label.trim() === '' || hasEmpty(node.children));

  return hasEmpty(draft.nodes) ? 'empty-label' : null;
}

export const draftProblemMessages: Record<DraftProblem, string> = {
  'no-branches': 'O mapa precisa ter pelo menos um ramo.',
  'empty-label':
    'Preencha o termo de todos os nós ou exclua os que estiverem vazios para poder salvar.',
};

/** O rascunho mudou em relação ao mapa de partida? */
export function isDraftDirty(draft: MindMapDraft, base: MindMapDraft): boolean {
  return JSON.stringify(normalize(draft)) !== JSON.stringify(normalize(base));
}

const trimNode = (node: MindMapNode): MindMapNode => {
  const note = node.note?.trim();

  return {
    label: node.label.trim(),
    ...(note ? { note } : {}),
    children: node.children.map(trimNode),
  };
};

const normalize = (draft: MindMapDraft) => ({
  subtitle: draft.subtitle.trim(),
  nodes: draft.nodes.map(trimNode),
});

/** O que vai para o main: textos aparados, frase vazia some, subtítulo vazio some. */
export function toSavePayload(draft: MindMapDraft): { subtitle?: string; nodes: MindMapNode[] } {
  const { subtitle, nodes } = normalize(draft);

  return { ...(subtitle ? { subtitle } : {}), nodes };
}
