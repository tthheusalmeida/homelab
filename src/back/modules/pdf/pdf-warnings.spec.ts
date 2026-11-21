import { buildPdfWarnings, LARGE_DOCUMENT_TOKENS } from './pdf-warnings';

const base = { pageCount: 10, emptyPages: 0, characters: 5_000, parts: 1 };

const codes = (input: Parameters<typeof buildPdfWarnings>[0]): string[] =>
  buildPdfWarnings(input).map((w) => w.code);

describe('buildPdfWarnings', () => {
  it('when the document is small and clean, should only give the two general notes', () => {
    expect(codes(base)).toEqual(['IMAGES_IGNORED', 'LAYOUT_MAY_SCRAMBLE']);
  });

  it('when one page has no text, should warn in the singular as information', () => {
    const warning = buildPdfWarnings({ ...base, emptyPages: 1 }).find(
      (w) => w.code === 'PAGES_WITHOUT_TEXT',
    );

    expect(warning?.level).toBe('info');
    expect(warning?.message).toBe(
      '1 página não tem texto (imagem ou digitalizada) e ficou de fora.',
    );
  });

  it('when many pages have no text, should raise the warning level', () => {
    const warning = buildPdfWarnings({ ...base, emptyPages: 3 }).find(
      (w) => w.code === 'PAGES_WITHOUT_TEXT',
    );

    expect(warning?.level).toBe('warning');
    expect(warning?.message).toContain('3 páginas');
  });

  it('when the text is huge, should warn about size, parts and cost', () => {
    const warning = buildPdfWarnings({
      ...base,
      characters: LARGE_DOCUMENT_TOKENS * 4,
      parts: 8,
    }).find((w) => w.code === 'LARGE_DOCUMENT');

    expect(warning?.level).toBe('warning');
    expect(warning?.message).toContain('8 partes');
    expect(warning?.message).toContain('estimativa');
  });

  it('when the text is just below the large threshold, should not warn about size', () => {
    expect(codes({ ...base, characters: LARGE_DOCUMENT_TOKENS * 4 - 8 })).not.toContain(
      'LARGE_DOCUMENT',
    );
  });

  it('when messages are built, should never name internal tools', () => {
    const text = buildPdfWarnings({ ...base, emptyPages: 5, characters: 400_000, parts: 12 })
      .map((w) => w.message)
      .join(' ');

    expect(text).not.toMatch(/pdfjs|pdf\.js|ffmpeg|whisper|yt-dlp|cuda/i);
  });
});
