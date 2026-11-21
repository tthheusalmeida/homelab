import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { PdfLimits } from '../../../shared/contracts/pdf';
import { MIN_DOCUMENT_CHARS, PdfExtractor } from './pdf-extractor';
import type { PdfDocumentHandle, PdfOpener } from './pdf-opener.port';
import { PdfMessages, PdfProblem, PdfReadError } from './pdf-read.error';

const noWait = (): Promise<void> => Promise.resolve();

function fakeDocument(pages: string[][]): PdfDocumentHandle & { close: jest.Mock } {
  return {
    pageCount: pages.length,
    readPage: jest.fn(async (n: number) => pages[n - 1]),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

const longPage = (label: string): string[] => [
  `${label}: ${'texto de verdade para passar do mínimo de caracteres '.repeat(6)}`,
];

describe('PdfExtractor', () => {
  let dir: string;
  let pdfPath: string;

  const writePdf = (content: string | Buffer = '%PDF-1.4\nconteúdo'): string => {
    fs.writeFileSync(pdfPath, content);

    return pdfPath;
  };

  const extractorWith = (document: PdfDocumentHandle): [PdfExtractor, jest.Mock] => {
    const open = jest.fn().mockResolvedValue(document);
    const opener: PdfOpener = { open };

    return [new PdfExtractor(opener, noWait), open];
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-extractor-'));
    pdfPath = path.join(dir, 'livro.pdf');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('when the pdf has text, should return cleaned pages, counts and the file size', async () => {
    const file = writePdf();
    const [extractor] = extractorWith(fakeDocument([longPage('Um'), longPage('Dois')]));

    const result = await extractor.extract(file);

    expect(result.pageCount).toBe(2);
    expect(result.pages[0]).toContain('Um:');
    expect(result.emptyPages).toBe(0);
    expect(result.sizeBytes).toBe(fs.statSync(file).size);
    expect(result.characters).toBe(result.pages.join('').length);
  });

  it('when a page has no text, should count it as empty and keep the page position', async () => {
    const [extractor] = extractorWith(fakeDocument([longPage('Um'), [], longPage('Três')]));

    const result = await extractor.extract(writePdf());

    expect(result.emptyPages).toBe(1);
    expect(result.pages[1]).toBe('');
    expect(result.pages[2]).toContain('Três:');
  });

  it('when reading, should report progress page by page', async () => {
    const [extractor] = extractorWith(fakeDocument([longPage('A'), longPage('B'), longPage('C')]));
    const onProgress = jest.fn();

    await extractor.extract(writePdf(), { onProgress });

    expect(onProgress.mock.calls).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('when reading, should give control back to the app between pages', async () => {
    const yieldTurn = jest.fn().mockResolvedValue(undefined);
    const extractor = new PdfExtractor(
      { open: jest.fn().mockResolvedValue(fakeDocument([longPage('A'), longPage('B')])) },
      yieldTurn,
    );

    await extractor.extract(writePdf());

    expect(yieldTurn).toHaveBeenCalledTimes(2);
  });

  it('when the file does not exist, should fail with NOT_FOUND', async () => {
    const [extractor] = extractorWith(fakeDocument([]));

    await expect(extractor.extract(path.join(dir, 'sumiu.pdf'))).rejects.toMatchObject({
      problem: PdfProblem.NOT_FOUND,
      message: PdfMessages.notFound,
    });
  });

  it('when the file does not start like a pdf, should fail with NOT_PDF before opening it', async () => {
    const file = writePdf('isto é só texto, não é um pdf');
    const [extractor, open] = extractorWith(fakeDocument([]));

    await expect(extractor.extract(file)).rejects.toMatchObject({ problem: PdfProblem.NOT_PDF });
    expect(open).not.toHaveBeenCalled();
  });

  it('when the header has a few bytes of garbage before it, should still accept the file', async () => {
    const [extractor] = extractorWith(fakeDocument([longPage('A')]));

    await expect(extractor.extract(writePdf('\n\n  %PDF-1.7\n...'))).resolves.toBeDefined();
  });

  it('when the file is bigger than the limit, should fail with TOO_LARGE and the size in the message', async () => {
    const file = writePdf();
    fs.truncateSync(file, PdfLimits.MAX_BYTES + 1);
    const [extractor, open] = extractorWith(fakeDocument([]));

    const error = await extractor.extract(file).catch((e: PdfReadError) => e);

    expect(error).toMatchObject({ problem: PdfProblem.TOO_LARGE });
    expect((error as PdfReadError).message).toContain('limite é 50 MB');
    expect(open).not.toHaveBeenCalled();
  });

  it('when the pdf has too many pages, should fail with TOO_MANY_PAGES and close the document', async () => {
    const document = fakeDocument([]);
    Object.defineProperty(document, 'pageCount', { value: PdfLimits.MAX_PAGES + 1 });
    const [extractor] = extractorWith(document);

    await expect(extractor.extract(writePdf())).rejects.toMatchObject({
      problem: PdfProblem.TOO_MANY_PAGES,
    });
    expect(document.close).toHaveBeenCalled();
  });

  it('when the pdf has almost no text, should fail with NO_TEXT explaining images are not read', async () => {
    const [extractor] = extractorWith(fakeDocument([['a'], [], ['b']]));

    const error = await extractor.extract(writePdf()).catch((e: PdfReadError) => e);

    expect(error).toMatchObject({ problem: PdfProblem.NO_TEXT });
    expect((error as PdfReadError).message).toContain('escaneado');
    expect(MIN_DOCUMENT_CHARS).toBeGreaterThan(2);
  });

  it('when cancelled between pages, should stop with CANCELLED and close the document', async () => {
    const document = fakeDocument([longPage('A'), longPage('B'), longPage('C')]);
    const [extractor] = extractorWith(document);
    let calls = 0;

    await expect(
      extractor.extract(writePdf(), { isCancelled: () => ++calls > 1 }),
    ).rejects.toMatchObject({ problem: PdfProblem.CANCELLED });
    expect(document.readPage).toHaveBeenCalledTimes(1);
    expect(document.close).toHaveBeenCalled();
  });

  it('when the opener fails (protected or corrupt), should pass its error on unchanged', async () => {
    const error = new PdfReadError(PdfProblem.ENCRYPTED, PdfMessages.encrypted);
    const extractor = new PdfExtractor({ open: jest.fn().mockRejectedValue(error) }, noWait);

    await expect(extractor.extract(writePdf())).rejects.toBe(error);
  });

  it('when closing the document fails, should still return the text', async () => {
    const document = fakeDocument([longPage('A')]);
    document.close.mockRejectedValue(new Error('falha ao fechar'));
    const [extractor] = extractorWith(document);

    await expect(extractor.extract(writePdf())).resolves.toMatchObject({ pageCount: 1 });
  });
});
