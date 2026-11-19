import { MIND_MAP_LIMITS } from '../../ai/prompts/mind-map.prompt';

import { hashContent, InvalidMindMapError, parseMindMap } from './mind-map';

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

describe('hashContent', () => {
  it('when the text is the same, should give the same hash', () => {
    expect(hashContent('abc')).toBe(hashContent('abc'));
  });

  it('when the text changes, should give another hash', () => {
    expect(hashContent('abc')).not.toBe(hashContent('abd'));
  });
});
