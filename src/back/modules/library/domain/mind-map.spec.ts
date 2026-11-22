import { MIND_MAP_LIMITS } from '../../ai/prompts/mind-map.prompt';

import { MIND_MAP_EDIT_LIMITS } from '../../../../shared/mind-map-limits';

import {
  hashContent,
  InvalidMindMapError,
  MindMapEditMessages,
  parseEditedMindMap,
  parseMindMap,
} from './mind-map';

const answer = (nodes: unknown) => JSON.stringify({ nodes });

describe('parseMindMap', () => {
  it('when the answer is valid, should return the tree', () => {
    const { nodes } = parseMindMap(
      answer([{ label: 'Camadas', children: [{ label: 'TCP', children: [] }] }, { label: 'DNS' }]),
    );

    expect(nodes).toEqual([
      { label: 'Camadas', children: [{ label: 'TCP', children: [] }] },
      { label: 'DNS', children: [] },
    ]);
  });

  it('when the JSON comes inside a code fence or with text around, should still parse it', () => {
    const text = `Aqui está:\n\`\`\`json\n${answer([{ label: 'A', children: [] }])}\n\`\`\`\nPronto.`;

    expect(parseMindMap(text).nodes).toEqual([{ label: 'A', children: [] }]);
  });

  it.each([
    ['text without JSON', 'não consegui'],
    ['broken JSON', '{"nodes": [}'],
    ['no nodes field', '{"outro": []}'],
    ['empty nodes', answer([])],
    ['only empty labels', answer([{ label: '  ' }, { label: 3 }, null])],
  ])('when the answer is %s, should throw InvalidMindMapError', (_name, text) => {
    expect(() => parseMindMap(text)).toThrow(InvalidMindMapError);
  });

  it('when a label has markdown, spaces and final punctuation, should clean it', () => {
    const [node] = parseMindMap(
      answer([{ label: '  **Camada  de   rede**.  ', children: [] }]),
    ).nodes;

    expect(node.label).toBe('Camada de rede');
  });

  it('when a label is too long, should cut it at a whole word with an ellipsis', () => {
    const [node] = parseMindMap(answer([{ label: 'palavra '.repeat(30) }])).nodes;

    expect(node.label.length).toBeLessThanOrEqual(MIND_MAP_LIMITS.maxLabelChars);
    expect(node.label.endsWith('palavra…')).toBe(true);
  });

  it('when a node has no label, should drop it and keep its siblings', () => {
    const { nodes } = parseMindMap(answer([{ label: '' }, { label: 'Fica' }]));

    expect(nodes.map((node) => node.label)).toEqual(['Fica']);
  });

  it('when there are too many branches, should keep only the first ones', () => {
    const many = Array.from({ length: 30 }, (_, index) => ({ label: `R${index}` }));

    expect(parseMindMap(answer(many)).nodes).toHaveLength(MIND_MAP_LIMITS.maxBranches);
  });

  it('when the tree is deeper than allowed, should cut the extra levels', () => {
    const deep = [
      {
        label: '1',
        children: [{ label: '2', children: [{ label: '3', children: [{ label: '4' }] }] }],
      },
    ];
    const [one] = parseMindMap(answer(deep)).nodes;

    expect(one.children[0].children[0].label).toBe('3');
    expect(one.children[0].children[0].children).toEqual([]);
  });

  it('when there are too many nodes in total, should stop at the limit', () => {
    const wide = Array.from({ length: MIND_MAP_LIMITS.maxBranches }, (_, branch) => ({
      label: `R${branch}`,
      children: Array.from({ length: 20 }, (_, leaf) => ({ label: `F${branch}-${leaf}` })),
    }));
    const count = (nodes: { children: unknown[] }[]): number =>
      nodes.reduce((sum, node) => sum + 1 + count(node.children as { children: unknown[] }[]), 0);

    expect(count(parseMindMap(answer(wide)).nodes)).toBe(MIND_MAP_LIMITS.maxNodes);
  });
});

describe('parseMindMap: note and subtitle', () => {
  const withNotes = (body: Record<string, unknown>) => JSON.stringify(body);

  it('when a node has a note, should keep it next to the label', () => {
    const { nodes } = parseMindMap(
      withNotes({
        nodes: [{ label: 'DNA', note: 'Material genético do indivíduo.', children: [] }],
      }),
    );

    expect(nodes).toEqual([
      { label: 'DNA', note: 'Material genético do indivíduo.', children: [] },
    ]);
  });

  it('when a node has no note, should not add the field', () => {
    const [node] = parseMindMap(withNotes({ nodes: [{ label: 'DNA' }] })).nodes;

    expect(node).not.toHaveProperty('note');
  });

  it('when the note is empty, not a text or just repeats the label, should drop it', () => {
    const { nodes } = parseMindMap(
      withNotes({
        nodes: [
          { label: 'A', note: '   ' },
          { label: 'B', note: 7 },
          { label: 'C', note: 'c.' },
        ],
      }),
    );

    expect(nodes.every((node) => !('note' in node))).toBe(true);
  });

  it('when the note has markdown and is too long, should clean it and cut at a whole word', () => {
    const [node] = parseMindMap(
      withNotes({ nodes: [{ label: 'A', note: `**${'frase '.repeat(40)}**` }] }),
    ).nodes;

    expect(node.note).not.toContain('*');
    expect(node.note!.length).toBeLessThanOrEqual(MIND_MAP_LIMITS.maxNoteChars);
    expect(node.note!.endsWith('frase…')).toBe(true);
  });

  it('when there is a subtitle, should clean and keep it', () => {
    const parsed = parseMindMap(
      withNotes({ subtitle: '  Estuda a **hereditariedade** ', nodes: [{ label: 'A' }] }),
    );

    expect(parsed.subtitle).toBe('Estuda a hereditariedade');
  });

  it('when the subtitle is missing, empty or not a text, should leave it out', () => {
    for (const subtitle of [undefined, '  ', 5]) {
      expect(parseMindMap(withNotes({ subtitle, nodes: [{ label: 'A' }] }))).not.toHaveProperty(
        'subtitle',
      );
    }
  });

  it('when the subtitle is too long, should cut it', () => {
    const { subtitle } = parseMindMap(
      withNotes({ subtitle: 'texto '.repeat(40), nodes: [{ label: 'A' }] }),
    );

    expect(subtitle!.length).toBeLessThanOrEqual(MIND_MAP_LIMITS.maxSubtitleChars);
  });
});

describe('parseEditedMindMap', () => {
  const nodes = (n: number) => Array.from({ length: n }, (_, i) => ({ label: `R${i}` }));

  it('when the user sends a valid map, should keep the text, notes, subtitle and tree as typed', () => {
    const parsed = parseEditedMindMap({
      subtitle: 'Do que trata',
      nodes: [{ label: 'Termo', note: 'Frase', children: [{ label: 'Filho' }] }],
    });

    expect(parsed).toEqual({
      subtitle: 'Do que trata',
      nodes: [{ label: 'Termo', note: 'Frase', children: [{ label: 'Filho', children: [] }] }],
    });
  });

  it('when the text has markdown characters and final punctuation, should keep them (it is what the user typed)', () => {
    const [node] = parseEditedMindMap({
      nodes: [{ label: 'snake_case *2* etapa:', note: 'a_b e c*d.' }],
    }).nodes;

    expect(node.label).toBe('snake_case *2* etapa:');
    expect(node.note).toBe('a_b e c*d.');
  });

  it('when the text has extra spaces, should tidy them', () => {
    const [node] = parseEditedMindMap({ nodes: [{ label: '  Termo   com   espaço  ' }] }).nodes;

    expect(node.label).toBe('Termo com espaço');
  });

  it.each([
    ['null', null],
    ['a list', []],
    ['a text', 'x'],
  ])('when the input is %s, should throw that the map is not valid', (_name, input) => {
    expect(() => parseEditedMindMap(input)).toThrow(MindMapEditMessages.notAMap);
  });

  it.each([
    ['no nodes', {}],
    ['empty nodes', { nodes: [] }],
    ['only empty labels', { nodes: [{ label: '  ' }, { label: 4 }] }],
  ])('when there is %s, should throw that at least one branch is needed', (_name, input) => {
    expect(() => parseEditedMindMap(input)).toThrow(InvalidMindMapError);
    expect(() => parseEditedMindMap(input)).toThrow(MindMapEditMessages.empty);
  });

  it('when a node has no label, should drop it', () => {
    expect(parseEditedMindMap({ nodes: [{ label: '' }, { label: 'Fica' }] }).nodes).toHaveLength(1);
  });

  it('when the note repeats the label or is empty, should drop it', () => {
    const { nodes: parsed } = parseEditedMindMap({
      nodes: [
        { label: 'A', note: 'a' },
        { label: 'B', note: '   ' },
      ],
    });

    expect(parsed.every((node) => !('note' in node))).toBe(true);
  });

  it('when texts are too long, should cut them with the edit limits (more room than the AI)', () => {
    const [node] = parseEditedMindMap({
      subtitle: 'x '.repeat(200),
      nodes: [{ label: 'palavra '.repeat(40), note: 'frase '.repeat(80) }],
    }).nodes;

    expect(node.label.length).toBeLessThanOrEqual(MIND_MAP_EDIT_LIMITS.maxLabelChars);
    expect(node.label.length).toBeGreaterThan(50);
    expect(node.note!.length).toBeLessThanOrEqual(MIND_MAP_EDIT_LIMITS.maxNoteChars);
    expect(node.note!.length).toBeGreaterThan(100);
  });

  it('when the subtitle is too long, should cut it', () => {
    const { subtitle } = parseEditedMindMap({ subtitle: 'texto '.repeat(60), nodes: nodes(1) });

    expect(subtitle!.length).toBeLessThanOrEqual(MIND_MAP_EDIT_LIMITS.maxSubtitleChars);
  });

  it('when there are too many branches, should keep only the first ones', () => {
    expect(parseEditedMindMap({ nodes: nodes(50) }).nodes).toHaveLength(
      MIND_MAP_EDIT_LIMITS.maxBranches,
    );
  });

  it('when the tree is deeper than the edit limit, should cut the extra levels', () => {
    let deep: Record<string, unknown> = { label: 'n6' };

    for (const label of ['n5', 'n4', 'n3', 'n2', 'n1']) {
      deep = { label, children: [deep] };
    }

    let level = parseEditedMindMap({ nodes: [deep] }).nodes[0];
    let depth = 1;

    while (level.children.length > 0) {
      level = level.children[0];
      depth += 1;
    }

    expect(depth).toBe(MIND_MAP_EDIT_LIMITS.maxDepth);
  });

  it('when there are too many nodes in total, should stop at the limit', () => {
    const wide = Array.from({ length: MIND_MAP_EDIT_LIMITS.maxBranches }, (_, i) => ({
      label: `R${i}`,
      children: Array.from({ length: 30 }, (_, j) => ({ label: `F${i}-${j}` })),
    }));
    const count = (list: { children: unknown[] }[]): number =>
      list.reduce((sum, node) => sum + 1 + count(node.children as { children: unknown[] }[]), 0);

    expect(count(parseEditedMindMap({ nodes: wide }).nodes)).toBe(MIND_MAP_EDIT_LIMITS.maxNodes);
  });
});

describe('hashContent', () => {
  it('when the text is the same, should give the same hash', () => {
    expect(hashContent('abc')).toBe(hashContent('abc'));
  });

  it('when the text changes, should give another hash', () => {
    expect(hashContent('abc')).not.toBe(hashContent('abd'));
  });
});

describe('parseMindMap: sloppy answers from the AI', () => {
  const tree =
    '{"subtitle": "Sobre redes", "nodes": [{"label": "Camadas", "note": "Níveis.", "children": [{"label": "TCP", "children": []}]}]}';

  it('when the JSON has trailing commas and comments, should still parse it', () => {
    const answer = '{\n // mapa\n "nodes": [{"label": "A", "children": [],},],\n}';

    expect(parseMindMap(answer).nodes).toEqual([{ label: 'A', children: [] }]);
  });

  it('when the answer was cut in the middle, should keep the branches that came whole', () => {
    const cut =
      '{"subtitle": "S", "nodes": [{"label": "A", "children": []}, {"label": "B", "children": [{"label": "B1", "children": []}, {"label": "B2", "ch';
    const result = parseMindMap(cut);

    expect(result.nodes.map((node) => node.label)).toEqual(['A', 'B']);
    expect(result.nodes[1].children.map((node) => node.label)).toEqual(['B1', 'B2']);
  });

  it('when the answer was cut inside a fence, should still read it', () => {
    expect(
      parseMindMap('```json\n{"nodes": [{"label": "A", "children": []}, {"label": "B"').nodes,
    ).toHaveLength(2);
  });

  it('when the map comes wrapped in a single key, should unwrap it', () => {
    expect(parseMindMap(`{"mapa_mental": ${tree}}`).nodes[0].label).toBe('Camadas');
  });

  it('when the answer has text with braces before the JSON, should skip them', () => {
    expect(parseMindMap(`Segue o mapa {pronto}:\n${tree}`).nodes[0].label).toBe('Camadas');
  });

  it('when a text value has a raw line break, should keep it as a space', () => {
    const answer = '{"nodes": [{"label": "Duas\nlinhas", "children": []}]}';

    expect(parseMindMap(answer).nodes[0].label).toBe('Duas linhas');
  });

  it('when there is no JSON at all, should throw InvalidMindMapError', () => {
    expect(() => parseMindMap('Desculpe, não consegui gerar o mapa.')).toThrow(InvalidMindMapError);
  });
});
