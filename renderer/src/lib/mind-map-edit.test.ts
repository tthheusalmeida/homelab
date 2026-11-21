import { describe, expect, it } from 'vitest';

import { MIND_MAP_EDIT_LIMITS } from '#shared/mind-map-limits';

import type { MindMap, MindMapNode } from './mind-map';
import {
  addBranch,
  addChild,
  canAddBranch,
  canAddChild,
  countNodes,
  draftFromMap,
  draftProblemMessages,
  getNode,
  isDraftDirty,
  pathKey,
  removeNode,
  setSubtitle,
  toSavePayload,
  updateNode,
  validateDraft,
  type MindMapDraft,
} from './mind-map-edit';

const leaf = (label: string, note?: string): MindMapNode => ({
  label,
  ...(note ? { note } : {}),
  children: [],
});

const map: MindMap = {
  title: 'Redes',
  subtitle: 'Estuda redes',
  size: 4,
  nodes: [
    { label: 'Camadas', note: 'Níveis da pilha', children: [leaf('TCP', 'Transporte')] },
    leaf('DNS'),
  ],
};

const draft = (): MindMapDraft => draftFromMap(map);

describe('draftFromMap', () => {
  it('when copying the map, should keep subtitle, terms, notes and the tree', () => {
    expect(draft()).toEqual({
      subtitle: 'Estuda redes',
      nodes: [
        { label: 'Camadas', note: 'Níveis da pilha', children: [leaf('TCP', 'Transporte')] },
        leaf('DNS'),
      ],
    });
  });

  it('when the map has no subtitle, should start with an empty one', () => {
    expect(draftFromMap({ ...map, subtitle: undefined }).subtitle).toBe('');
  });

  it('when editing the copy, should not change the original map', () => {
    const copy = draft();

    updateNode(copy, [0], { label: 'Mudou' });
    copy.nodes[0].children.push(leaf('X'));

    expect(map.nodes[0].label).toBe('Camadas');
    expect(map.nodes[0].children).toHaveLength(1);
  });
});

describe('updateNode and setSubtitle', () => {
  it('when changing a branch term, should change only that branch', () => {
    const next = updateNode(draft(), [1], { label: 'Nomes' });

    expect(next.nodes.map((node) => node.label)).toEqual(['Camadas', 'Nomes']);
    expect(next.nodes[0]).toBe(draft().nodes[0] && next.nodes[0]);
  });

  it('when changing a deep node, should change only that node and keep its siblings', () => {
    const base = draft();
    const next = updateNode(base, [0, 0], { note: 'Novo texto' });

    expect(next.nodes[0].children[0]).toMatchObject({ label: 'TCP', note: 'Novo texto' });
    expect(next.nodes[1]).toBe(base.nodes[1]);
  });

  it('when changing, should not mutate the previous draft', () => {
    const base = draft();

    updateNode(base, [0], { label: 'Outro' });

    expect(base.nodes[0].label).toBe('Camadas');
  });

  it('when the path does not exist, should return the nodes unchanged', () => {
    const base = draft();

    expect(updateNode(base, [9], { label: 'x' }).nodes).toEqual(base.nodes);
    expect(updateNode(base, [0, 9], { label: 'x' }).nodes).toEqual(base.nodes);
  });

  it('when setting the subtitle, should change only it', () => {
    const base = draft();
    const next = setSubtitle(base, 'Outro assunto');

    expect(next.subtitle).toBe('Outro assunto');
    expect(next.nodes).toBe(base.nodes);
  });
});

describe('addChild and addBranch', () => {
  it('when adding a child, should put an empty node at the end of that node and say where', () => {
    const { draft: next, path } = addChild(draft(), [0]);

    expect(next.nodes[0].children).toHaveLength(2);
    expect(next.nodes[0].children[1]).toEqual(leaf(''));
    expect(path).toEqual([0, 1]);
    expect(getNode(next.nodes, path!)).toEqual(leaf(''));
  });

  it('when adding a child to a node without children, should be the first child', () => {
    const { path } = addChild(draft(), [1]);

    expect(path).toEqual([1, 0]);
  });

  it('when adding a branch, should put an empty branch at the end and say where', () => {
    const { draft: next, path } = addBranch(draft());

    expect(next.nodes).toHaveLength(3);
    expect(path).toEqual([2]);
  });

  it('when the parent path does not exist, should change nothing', () => {
    const base = draft();
    const result = addChild(base, [7]);

    expect(result.draft).toBe(base);
    expect(result.path).toBeNull();
  });

  it('when the node is already at the depth limit, should not add a child', () => {
    let current = draftFromMap({ ...map, nodes: [leaf('n1')] });
    let path: readonly number[] = [0];

    for (let level = 1; level < MIND_MAP_EDIT_LIMITS.maxDepth; level += 1) {
      const added = addChild(current, path);

      current = added.draft;
      path = added.path!;
    }

    expect(path).toHaveLength(MIND_MAP_EDIT_LIMITS.maxDepth);
    expect(canAddChild(current, path)).toBe(false);
    expect(addChild(current, path).path).toBeNull();
  });

  it('when there are already the maximum branches, should not add another', () => {
    const full: MindMapDraft = {
      subtitle: '',
      nodes: Array.from({ length: MIND_MAP_EDIT_LIMITS.maxBranches }, (_, i) => leaf(`R${i}`)),
    };

    expect(canAddBranch(full)).toBe(false);
    expect(addBranch(full).path).toBeNull();
    expect(addBranch(full).draft).toBe(full);
  });

  it('when the map has the maximum number of nodes, should not add children or branches', () => {
    const branches = Array.from({ length: 10 }, (_, i) => ({
      label: `R${i}`,
      children: Array.from({ length: 14 }, (_, j) => leaf(`F${i}-${j}`)),
    }));
    const full: MindMapDraft = { subtitle: '', nodes: branches };

    expect(countNodes(full.nodes)).toBe(MIND_MAP_EDIT_LIMITS.maxNodes);
    expect(canAddChild(full, [0])).toBe(false);
    expect(canAddBranch(full)).toBe(false);
  });

  it('when asking if a child fits in a missing node, should say no', () => {
    expect(canAddChild(draft(), [5])).toBe(false);
  });
});

describe('removeNode', () => {
  it('when removing a branch, should remove it and everything inside it', () => {
    const next = removeNode(draft(), [0]);

    expect(next.nodes.map((node) => node.label)).toEqual(['DNS']);
    expect(countNodes(next.nodes)).toBe(1);
  });

  it('when removing a deep node, should keep the rest', () => {
    const next = removeNode(draft(), [0, 0]);

    expect(next.nodes[0].children).toEqual([]);
    expect(next.nodes).toHaveLength(2);
  });

  it('when the path does not exist, should change nothing', () => {
    expect(removeNode(draft(), [9]).nodes).toEqual(draft().nodes);
  });
});

describe('validateDraft', () => {
  it('when the map is fine, should have no problem', () => {
    expect(validateDraft(draft())).toBeNull();
  });

  it('when there are no branches, should say so', () => {
    expect(validateDraft({ subtitle: '', nodes: [] })).toBe('no-branches');
  });

  it('when a node has an empty or blank term, should say so (even a deep one)', () => {
    expect(validateDraft(updateNode(draft(), [1], { label: '   ' }))).toBe('empty-label');
    expect(validateDraft(updateNode(draft(), [0, 0], { label: '' }))).toBe('empty-label');
  });

  it('when a node has no note, should be fine (the note is optional)', () => {
    expect(validateDraft(updateNode(draft(), [1], { note: '' }))).toBeNull();
  });

  it('when a problem exists, should have a message for it in Portuguese', () => {
    expect(draftProblemMessages['no-branches']).toMatch(/pelo menos um ramo/);
    expect(draftProblemMessages['empty-label']).toMatch(/Preencha o termo/);
  });
});

describe('isDraftDirty', () => {
  it('when nothing changed, should not be dirty', () => {
    expect(isDraftDirty(draft(), draft())).toBe(false);
  });

  it('when a term, a note, the subtitle or the tree changed, should be dirty', () => {
    expect(isDraftDirty(updateNode(draft(), [0], { label: 'X' }), draft())).toBe(true);
    expect(isDraftDirty(updateNode(draft(), [1], { note: 'nova' }), draft())).toBe(true);
    expect(isDraftDirty(setSubtitle(draft(), 'outro'), draft())).toBe(true);
    expect(isDraftDirty(removeNode(draft(), [1]), draft())).toBe(true);
    expect(isDraftDirty(addBranch(draft()).draft, draft())).toBe(true);
  });

  it('when only spaces around the text changed, should not be dirty', () => {
    const spaced = updateNode(draft(), [0], { label: '  Camadas  ' });

    expect(isDraftDirty(spaced, draft())).toBe(false);
  });

  it('when an empty note was added and removed, should not be dirty', () => {
    expect(isDraftDirty(updateNode(draft(), [1], { note: '' }), draft())).toBe(false);
  });
});

describe('toSavePayload', () => {
  it('when saving, should trim the texts and drop empty notes', () => {
    const edited = updateNode(updateNode(draft(), [1], { label: '  DNS  ', note: '   ' }), [0], {
      note: '  Níveis  ',
    });
    const { nodes } = toSavePayload(edited);

    expect(nodes[1]).toEqual({ label: 'DNS', children: [] });
    expect(nodes[0].note).toBe('Níveis');
  });

  it('when the subtitle is empty or blank, should leave it out', () => {
    expect(toSavePayload(setSubtitle(draft(), '   '))).not.toHaveProperty('subtitle');
    expect(toSavePayload(setSubtitle(draft(), ' Assunto '))).toMatchObject({ subtitle: 'Assunto' });
  });

  it('when saving, should keep the whole tree', () => {
    expect(countNodes(toSavePayload(draft()).nodes)).toBe(3);
  });
});

describe('pathKey', () => {
  it('when turning a path into a key, should join the positions', () => {
    expect(pathKey([2, 0, 1])).toBe('2.0.1');
    expect(pathKey([3])).toBe('3');
  });
});
