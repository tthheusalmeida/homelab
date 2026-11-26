import { buildPdfWarnings, LARGE_DOCUMENT_TOKENS, SLOW_OCR_PAGES } from './pdf-warnings';

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

  it('when pages were read from images, should say how many and the languages, and that errors are possible', () => {
    const warning = buildPdfWarnings({
      ...base,
      ocrPages: 22,
      languages: ['Português', 'Francês'],
    }).find((w) => w.code === 'OCR_USED');

    expect(warning?.level).toBe('info');
    expect(warning?.message).toContain('22 páginas');
    expect(warning?.message).toContain('Português e Francês');
    expect(warning?.message).toContain('erros');
  });

  it('when one page was read from an image, should use the singular', () => {
    const warning = buildPdfWarnings({ ...base, ocrPages: 1, languages: ['Inglês'] }).find(
      (w) => w.code === 'OCR_USED',
    );

    expect(warning?.message).toContain('1 página não tinha');
    expect(warning?.message).toContain('Idioma: Inglês.');
  });

  it('when three languages were used, should list them with commas and "e"', () => {
    const warning = buildPdfWarnings({
      ...base,
      ocrPages: 3,
      languages: ['Português', 'Inglês', 'Francês'],
    }).find((w) => w.code === 'OCR_USED');

    expect(warning?.message).toContain('Português, Inglês e Francês');
  });

  it('when no page was read from images, should not mention the image reading', () => {
    expect(codes(base)).not.toEqual(
      expect.arrayContaining(['OCR_USED', 'OCR_DISCARDED', 'OCR_SLOW']),
    );
  });

  it('when pages were discarded as photos, should warn they are out of the summary and not repeat the generic warning', () => {
    const result = buildPdfWarnings({ ...base, emptyPages: 3, ocrPages: 20, ocrDiscardedPages: 3 });
    const discarded = result.find((w) => w.code === 'OCR_DISCARDED');

    expect(discarded?.level).toBe('warning');
    expect(discarded?.message).toContain('3 páginas são imagem ou foto');
    expect(result.map((w) => w.code)).not.toContain('PAGES_WITHOUT_TEXT');
  });

  it('when one page was discarded, should use the singular', () => {
    const warning = buildPdfWarnings({
      ...base,
      emptyPages: 1,
      ocrPages: 5,
      ocrDiscardedPages: 1,
    }).find((w) => w.code === 'OCR_DISCARDED');

    expect(warning?.message).toContain('1 página é imagem');
    expect(warning?.message).toContain('ficou de fora');
  });

  it('when other pages are empty besides the discarded ones, should still warn about them', () => {
    const result = buildPdfWarnings({ ...base, emptyPages: 3, ocrPages: 20, ocrDiscardedPages: 2 });

    expect(result.find((w) => w.code === 'PAGES_WITHOUT_TEXT')?.message).toContain('1 página');
  });

  it('when many pages were read from images, should warn it takes long and that the result is saved', () => {
    const warning = buildPdfWarnings({ ...base, ocrPages: SLOW_OCR_PAGES }).find(
      (w) => w.code === 'OCR_SLOW',
    );

    expect(warning?.level).toBe('warning');
    expect(warning?.message).toContain('fica salvo');
  });

  it('when few pages were read from images, should not warn about time', () => {
    expect(codes({ ...base, ocrPages: SLOW_OCR_PAGES - 1 })).not.toContain('OCR_SLOW');
  });

  it('when messages are built, should never name internal tools', () => {
    const text = buildPdfWarnings({
      ...base,
      emptyPages: 5,
      characters: 400_000,
      parts: 12,
      ocrPages: SLOW_OCR_PAGES,
      ocrDiscardedPages: 2,
      languages: ['Português'],
    })
      .map((w) => w.message)
      .join(' ');

    expect(text).not.toMatch(/pdfjs|pdf\.js|ffmpeg|whisper|yt-dlp|cuda|tesseract|\bocr\b/i);
  });
});
