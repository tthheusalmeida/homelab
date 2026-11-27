import { chunkMarkdown } from './chunker';

describe('chunkMarkdown', () => {
  it('when the page has sections, should make one chunk per section with its heading path', () => {
    const chunks = chunkMarkdown(
      ['# Resumo', '', 'Intro.', '', '## Primeira Maneira', '', 'Fluxo de valor.'].join('\n'),
    );

    expect(chunks.map((chunk) => [chunk.headingPath, chunk.text])).toEqual([
      [['Resumo'], 'Intro.'],
      [['Resumo', 'Primeira Maneira'], 'Fluxo de valor.'],
    ]);
  });

  it('when a chunk belongs to a heading, should carry the same anchor id as the viewer', () => {
    const [chunk] = chunkMarkdown('## Ligações Químicas\n\nTexto.');

    expect(chunk.anchor).toBe('ligacoes-quimicas');
  });

  it('when a chunk starts, should record the line where its text begins', () => {
    const chunks = chunkMarkdown(['# A', '', 'um', '', '## B', 'dois'].join('\n'));

    expect(chunks.map((chunk) => chunk.line)).toEqual([3, 6]);
  });

  it('when there is text before the first heading, should keep it with no anchor', () => {
    const [chunk] = chunkMarkdown('Texto solto.\n\n# Título\n\nCorpo.');

    expect(chunk).toMatchObject({ anchor: null, headingPath: [], text: 'Texto solto.' });
  });

  it('when a section has no text, should make no chunk but keep its title in the path below', () => {
    const chunks = chunkMarkdown('# Pai\n## Filho\n\nTexto.');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].headingPath).toEqual(['Pai', 'Filho']);
  });

  it('when a heading of the same level follows, should drop the previous one from the path', () => {
    const chunks = chunkMarkdown('## A\n\nx\n\n## B\n\ny');

    expect(chunks.map((chunk) => chunk.headingPath)).toEqual([['A'], ['B']]);
  });

  it('when a section is bigger than the limit, should split it by paragraph under the same anchor', () => {
    const paragraph = 'palavra '.repeat(30).trim();
    const chunks = chunkMarkdown(
      `## Longa\n\n${[paragraph, paragraph, paragraph].join('\n\n')}`,
      500,
    );

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.anchor === 'longa')).toBe(true);
    expect(chunks.every((chunk) => chunk.text.length <= 500)).toBe(true);
  });

  it('when one paragraph is bigger than the limit, should split it by sentence', () => {
    const sentence = 'Esta é uma frase de teste com tamanho razoável. ';
    const chunks = chunkMarkdown(`## Texto\n\n${sentence.repeat(20)}`, 300);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((chunk) => chunk.text.length <= 300)).toBe(true);
  });

  it('when a code block has a blank line inside, should not split the block', () => {
    const chunks = chunkMarkdown('## Código\n\n```sh\nls\n\npwd\n```\n\nFim.', 1600);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toContain('ls\n\npwd');
  });

  it('when the chunks are made, should number them in order', () => {
    const chunks = chunkMarkdown('## A\n\nx\n\n## B\n\ny\n\n## C\n\nz');

    expect(chunks.map((chunk) => chunk.ordinal)).toEqual([0, 1, 2]);
  });

  it('when the page is empty, should return no chunks', () => {
    expect(chunkMarkdown('')).toEqual([]);
    expect(chunkMarkdown('# Só título')).toEqual([]);
  });

  it('when the file uses CRLF, should chunk it the same way', () => {
    const chunks = chunkMarkdown('## A\r\n\r\nTexto.\r\n');

    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe('Texto.');
  });
});
