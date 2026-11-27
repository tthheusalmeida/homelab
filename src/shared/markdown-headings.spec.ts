import {
  createHeadingIdGenerator,
  normalizeHeadingKey,
  scanHeadings,
  slugifyHeading,
} from './markdown-headings';

describe('slugifyHeading', () => {
  it('when the title has accents and punctuation, should return a plain slug', () => {
    expect(slugifyHeading('Ligações Químicas!')).toBe('ligacoes-quimicas');
  });

  it('when the title has no letters or digits, should fall back to "secao"', () => {
    expect(slugifyHeading('!!!')).toBe('secao');
  });
});

describe('normalizeHeadingKey', () => {
  it('when the text has accents, caps and extra spaces, should normalize all of them', () => {
    expect(normalizeHeadingKey('  PrÁtica   Única ')).toBe('pratica unica');
  });
});

describe('createHeadingIdGenerator', () => {
  it('when a title repeats, should number the repeats in order of appearance', () => {
    const next = createHeadingIdGenerator();

    expect([next('Fluxo'), next('Fluxo'), next('Fluxo'), next('Outro')]).toEqual([
      'fluxo',
      'fluxo-2',
      'fluxo-3',
      'outro',
    ]);
  });
});

describe('scanHeadings', () => {
  it('when the markdown has headings, should return level, text, id and line', () => {
    const markdown = ['# Título', '', 'texto', '## Primeira Maneira', 'mais'].join('\n');

    expect(scanHeadings(markdown)).toEqual([
      { level: 1, text: 'Título', id: 'titulo', line: 1 },
      { level: 2, text: 'Primeira Maneira', id: 'primeira-maneira', line: 4 },
    ]);
  });

  it('when a hash line is inside a code fence, should ignore it', () => {
    const markdown = ['# Real', '```bash', '# comentário', '```', '## Depois'].join('\n');

    expect(scanHeadings(markdown).map((heading) => heading.text)).toEqual(['Real', 'Depois']);
  });

  it('when a heading has links and emphasis, should keep only the plain text', () => {
    const [heading] = scanHeadings('## **Veja** [o guia](http://x.y) `agora`');

    expect(heading.text).toBe('Veja o guia agora');
  });

  it('when the file uses CRLF, should still find the headings with the right lines', () => {
    expect(scanHeadings('# A\r\ntexto\r\n## B\r\n').map((heading) => heading.line)).toEqual([1, 3]);
  });

  it('when the same title appears twice, should give the second one a numbered id', () => {
    const ids = scanHeadings('## Resumo\n\n## Resumo').map((heading) => heading.id);

    expect(ids).toEqual(['resumo', 'resumo-2']);
  });
});
