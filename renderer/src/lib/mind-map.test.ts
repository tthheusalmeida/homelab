import { describe, expect, it } from 'vitest';

import {
  buildMindMap,
  fromAiMap,
  MIND_MAP_NODE_MAX_CHARS,
  MIND_MAP_NOTE_MAX_CHARS,
  splitItem,
  type MindMapNode,
} from './mind-map';

const labels = (nodes: MindMapNode[]) => nodes.map((node) => node.label);

describe('splitItem', () => {
  it('when the item starts with a bold term, should use it as the label and the rest as the note', () => {
    expect(splitItem('**Container**: processo isolado que compartilha o kernel')).toEqual({
      label: 'Container',
      note: 'processo isolado que compartilha o kernel',
    });
    expect(splitItem('**Imagem:** modelo de leitura')).toEqual({
      label: 'Imagem',
      note: 'modelo de leitura',
    });
    expect(splitItem('**Volume** — guarda dados fora do container')).toEqual({
      label: 'Volume',
      note: 'guarda dados fora do container',
    });
  });

  it('when the bold term has nothing after it, should have no note', () => {
    expect(splitItem('**Volume**')).toEqual({ label: 'Volume' });
  });

  it('when there is no bold but a short term before a colon, should split there', () => {
    expect(splitItem('Dockerfile: receita para montar a imagem')).toEqual({
      label: 'Dockerfile',
      note: 'receita para montar a imagem',
    });
  });

  it('when the colon comes too far or is part of an address or time, should not split there', () => {
    expect(splitItem('Veja https://exemplo.com para detalhes').label).toBe(
      'Veja https://exemplo.com para detalhes',
    );
    expect(splitItem('Reunião às 10:30 com o time').label).toBe('Reunião às 10:30 com o time');
  });

  it('when the item is a sentence, should use the first sentence as the label and the rest as the note', () => {
    expect(splitItem('Rode o build. Depois suba o serviço.')).toEqual({
      label: 'Rode o build',
      note: 'Depois suba o serviço.',
    });
    expect(splitItem('Use cache — assim fica mais rápido')).toEqual({
      label: 'Use cache',
      note: 'assim fica mais rápido',
    });
    expect(splitItem('Versão 3.5 estável')).toEqual({ label: 'Versão 3.5 estável' });
  });

  it('when the label is too long, should cut it at a whole word with an ellipsis', () => {
    const { label } = splitItem('palavra '.repeat(30));

    expect(label.length).toBeLessThanOrEqual(MIND_MAP_NODE_MAX_CHARS);
    expect(label.endsWith('palavra…')).toBe(true);
  });

  it('when the note is too long, should cut it too', () => {
    const { note } = splitItem(`**Termo**: ${'frase '.repeat(40)}`);

    expect(note!.length).toBeLessThanOrEqual(MIND_MAP_NOTE_MAX_CHARS);
    expect(note!.endsWith('frase…')).toBe(true);
  });

  it('when the text has links and code, should show only the plain text', () => {
    expect(splitItem('[Documentação](https://x.com) e `docker run`').label).toBe(
      'Documentação e docker run',
    );
  });
});

describe('buildMindMap', () => {
  it('when the text has headings, should nest them by level and keep the title apart', () => {
    const map = buildMindMap('## A\n### A1\n### A2\n## B', 'Aula');

    expect(map.title).toBe('Aula');
    expect(labels(map.nodes)).toEqual(['A', 'B']);
    expect(labels(map.nodes[0].children)).toEqual(['A1', 'A2']);
  });

  it('when there is a single # heading, should not repeat it as a node', () => {
    expect(labels(buildMindMap('# Aula\n## A\n## B', 'Aula').nodes)).toEqual(['A', 'B']);
  });

  it('when there are several # headings, should keep each as a branch', () => {
    const { nodes } = buildMindMap('# A\n## A1\n# B', 'Aula');

    expect(labels(nodes)).toEqual(['A', 'B']);
    expect(labels(nodes[0].children)).toEqual(['A1']);
  });

  it('when a level is skipped, should still attach the heading to the closest parent', () => {
    expect(labels(buildMindMap('## A\n#### Fundo', 'Aula').nodes[0].children)).toEqual(['Fundo']);
  });

  it('when there are list items, should keep term and note, nested by indent', () => {
    const { nodes } = buildMindMap(
      [
        '## A',
        '- **Um**: explicação do primeiro',
        '  - sub um. detalhe',
        '- Dois: outra explicação',
        '1. Três é uma frase. E mais coisas.',
      ].join('\n'),
      'Aula',
    );
    const [section] = nodes;

    expect(section.children).toMatchObject([
      { label: 'Um', note: 'explicação do primeiro' },
      { label: 'Dois', note: 'outra explicação' },
      { label: 'Três é uma frase', note: 'E mais coisas.' },
    ]);
    expect(section.children[0].children).toMatchObject([{ label: 'sub um', note: 'detalhe' }]);
  });

  it('when items are nested deeper than two levels, should leave the deeper ones out', () => {
    const { nodes } = buildMindMap('## A\n- a\n  - b\n    - c\n      - d\n- e', 'Aula');

    expect(labels(nodes[0].children)).toEqual(['a', 'e']);
    expect(labels(nodes[0].children[0].children)).toEqual(['b']);
    expect(nodes[0].children[0].children[0].children).toEqual([]);
  });

  it('when an item is a task, should drop the checkbox', () => {
    expect(
      labels(buildMindMap('## A\n- [x] feito\n- [ ] falta', 'Aula').nodes[0].children),
    ).toEqual(['feito', 'falta']);
  });

  it('when a paragraph has bold terms, should turn the terms into nodes instead of the text', () => {
    const { nodes } = buildMindMap(
      '## A\nO **kernel** gerencia o **escalonador** e a **memória**.',
      'Aula',
    );

    expect(labels(nodes[0].children)).toEqual(['kernel', 'escalonador', 'memória']);
  });

  it('when a paragraph has no bold and the heading has nothing else, should keep its first sentence', () => {
    const { nodes } = buildMindMap('## A\nEsta seção explica o básico. Depois detalha.', 'Aula');

    expect(labels(nodes[0].children)).toEqual(['Esta seção explica o básico']);
  });

  it('when a section has only plain paragraphs, should keep the first sentence of each', () => {
    const { nodes } = buildMindMap('## A\nPrimeira ideia. Mais.\n\nSegunda ideia. Mais.', 'Aula');

    expect(labels(nodes[0].children)).toEqual(['Primeira ideia', 'Segunda ideia']);
  });

  it('when the heading also has list items or subheadings, should drop its plain intro paragraph', () => {
    const withList = buildMindMap('## A\nIntrodução solta.\n- **Item**: x', 'Aula');
    const withSub = buildMindMap('## A\nIntrodução solta.\n### A1', 'Aula');

    expect(labels(withList.nodes[0].children)).toEqual(['Item']);
    expect(labels(withSub.nodes[0].children)).toEqual(['A1']);
    expect(withList.size).toBe(2);
  });

  it('when the text has code blocks, tables and rules, should ignore them', () => {
    const { nodes, size } = buildMindMap(
      '## A\n```ts\n## falso\n- falso\n```\n| a | b |\n|---|---|\n---\n![img](x.png)',
      'Aula',
    );

    expect(labels(nodes)).toEqual(['A']);
    expect(nodes[0].children).toEqual([]);
    expect(size).toBe(1);
  });

  it('when a heading has inline markup, should show only the plain text', () => {
    expect(buildMindMap('## **Negrito** e [link](https://x.com)', 'Aula').nodes[0].label).toBe(
      'Negrito e link',
    );
  });

  it('when the text has HTML characters, should keep them as plain text (the screen escapes)', () => {
    const map = buildMindMap('## a & b\n- 1 < 2 > 0', '<b>x</b>');

    expect(map.title).toBe('<b>x</b>');
    expect(map.nodes[0].label).toBe('a & b');
    expect(map.nodes[0].children[0].label).toBe('1 < 2 > 0');
  });

  it('when a heading is too long, should cut it', () => {
    const { label } = buildMindMap(`## ${'palavra '.repeat(30)}`, 'Aula').nodes[0];

    expect(label.length).toBeLessThanOrEqual(MIND_MAP_NODE_MAX_CHARS);
    expect(label.endsWith('…')).toBe(true);
  });

  it('when the title is empty, should use a default', () => {
    expect(buildMindMap('## A', '  ').title).toBe('Sem título');
  });

  it('when counting nodes, should not count the title', () => {
    expect(buildMindMap('## A\n- x\n- y', 'Aula').size).toBe(3);
  });

  it('when the text is empty, should return no nodes', () => {
    const { nodes, size } = buildMindMap('', 'Aula');

    expect(nodes).toEqual([]);
    expect(size).toBe(0);
  });
});

describe('fromAiMap', () => {
  const ai = {
    subtitle: 'Estuda as redes',
    nodes: [
      { label: 'Camadas', note: 'Níveis da pilha.', children: [{ label: 'TCP', children: [] }] },
      { label: 'DNS', children: [] },
    ],
  };

  it('when given the AI map, should keep title, subtitle, notes and the tree', () => {
    const map = fromAiMap('Redes', ai);

    expect(map.title).toBe('Redes');
    expect(map.subtitle).toBe('Estuda as redes');
    expect(map.nodes).toEqual(ai.nodes);
  });

  it('when counting, should include every node but not the title', () => {
    expect(fromAiMap('Redes', ai).size).toBe(3);
  });

  it('when there is no subtitle, should leave it out', () => {
    expect(fromAiMap('Redes', { nodes: ai.nodes })).not.toHaveProperty('subtitle');
  });

  it('when the title is empty, should use a default', () => {
    expect(fromAiMap(' ', ai).title).toBe('Sem título');
  });
});
