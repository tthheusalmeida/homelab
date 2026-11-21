import { chunkPages } from './pdf-chunker';

describe('chunkPages', () => {
  it('when all pages fit in one part, should return a single chunk with the page range', () => {
    const chunks = chunkPages(['Página um.', 'Página dois.', 'Página três.'], 1000);

    expect(chunks).toEqual([
      { index: 0, startPage: 1, endPage: 3, text: 'Página um.\n\nPágina dois.\n\nPágina três.' },
    ]);
  });

  it('when pages exceed the limit, should split between pages and keep the order', () => {
    const page = 'a'.repeat(60);

    const chunks = chunkPages([page, page, page], 130);

    expect(chunks.map((c) => [c.index, c.startPage, c.endPage])).toEqual([
      [0, 1, 2],
      [1, 3, 3],
    ]);
  });

  it('when a part is built, should never pass the limit', () => {
    const pages = Array.from({ length: 40 }, (_, i) => `Parágrafo ${i}. `.repeat(8).trim());

    const chunks = chunkPages(pages, 300);

    expect(chunks.every((c) => c.text.length <= 300)).toBe(true);
  });

  it('when a page is bigger than the limit, should split it between paragraphs first', () => {
    const paragraph = 'p'.repeat(80);
    const page = [paragraph, paragraph, paragraph].join('\n\n');

    const chunks = chunkPages([page], 170);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].text).toBe(`${paragraph}\n\n${paragraph}`);
    expect(chunks[1].text).toBe(paragraph);
    expect(chunks.every((c) => c.startPage === 1 && c.endPage === 1)).toBe(true);
  });

  it('when a single paragraph is bigger than the limit, should split it by sentences', () => {
    const sentence = 'Esta é uma frase de teste.';
    const paragraph = Array.from({ length: 10 }, () => sentence).join(' ');

    const chunks = chunkPages([paragraph], 80);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.text.length <= 80)).toBe(true);
    expect(chunks.map((c) => c.text).join(' ')).toBe(paragraph);
  });

  it('when some pages are empty, should skip them and keep real page numbers', () => {
    const chunks = chunkPages(['', 'Só esta.', '   ', 'E esta.'], 1000);

    expect(chunks).toEqual([{ index: 0, startPage: 2, endPage: 4, text: 'Só esta.\n\nE esta.' }]);
  });

  it('when there is no text at all, should return no chunks', () => {
    expect(chunkPages(['', '  '], 100)).toEqual([]);
  });

  it('when no limit is given, should use the default size', () => {
    const chunks = chunkPages(['x'.repeat(10_000), 'y'.repeat(10_000)]);

    expect(chunks).toHaveLength(1);
  });
});
