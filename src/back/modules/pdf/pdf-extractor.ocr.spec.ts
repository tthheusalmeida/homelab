import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { PdfLimits } from '../../../shared/contracts/pdf';
import type { OcrReadRequest, OcrReadResult } from './ocr/ocr-page-reader';
import { PdfExtractor, type PdfOcr } from './pdf-extractor';
import type { PdfDocumentHandle } from './pdf-opener.port';
import { PdfMessages, PdfProblem } from './pdf-read.error';

const noWait = (): Promise<void> => Promise.resolve();

const digital = (label: string): string[] => [
  `${label}: ${'texto digital de verdade para passar do mínimo de caracteres '.repeat(5)}`,
];

const scanned = (label: string): string[] => [
  `${label}: ${'texto lido da imagem com bastante conteúdo para o resumo '.repeat(5)}`,
];

interface FakePage {
  lines: string[];
  images?: boolean;
}

function fakeDocument(
  pages: FakePage[],
  features: { render?: boolean } = {},
): PdfDocumentHandle & { hasImages: jest.Mock; close: jest.Mock } {
  return {
    pageCount: pages.length,
    readPage: jest.fn(async (n: number) => pages[n - 1].lines),
    hasImages: jest.fn(async (n: number) => pages[n - 1].images ?? false),
    ...(features.render === false ? {} : { renderPage: jest.fn(async () => new Uint8Array([1])) }),
    close: jest.fn().mockResolvedValue(undefined),
  };
}

const outcome = (overrides: Partial<OcrReadResult> = {}): OcrReadResult => ({
  texts: new Map(),
  discardedPages: [],
  languages: ['por'],
  ...overrides,
});

describe('PdfExtractor with image reading', () => {
  let dir: string;
  let pdfPath: string;
  let ocr: { read: jest.Mock };

  const extractorWith = (document: PdfDocumentHandle, withOcr: PdfOcr | undefined = ocr) =>
    new PdfExtractor({ open: jest.fn().mockResolvedValue(document) }, noWait, withOcr);

  const writePdf = (): string => {
    fs.writeFileSync(pdfPath, '%PDF-1.4\nconteúdo do arquivo');

    return pdfPath;
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-extractor-ocr-'));
    pdfPath = path.join(dir, 'aula.pdf');
    ocr = { read: jest.fn().mockResolvedValue(outcome()) };
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when only some pages have no text but have images, should read only those by image and keep the digital ones', async () => {
    const document = fakeDocument([
      { lines: digital('Um') },
      { lines: [], images: true },
      { lines: digital('Três') },
    ]);

    ocr.read.mockResolvedValue(outcome({ texts: new Map([[2, scanned('Dois')]]) }));

    const result = await extractorWith(document).extract(writePdf());

    const request = ocr.read.mock.calls[0][0] as OcrReadRequest;

    expect(request.pages).toEqual([2]);
    expect(request.knownText).toContain('Um:');
    expect(request.knownText).toContain('Três:');
    expect(result.pages[0]).toContain('Um:');
    expect(result.pages[1]).toContain('Dois:');
    expect(result.pages[2]).toContain('Três:');
    expect(result.ocrPages).toBe(1);
    expect(result.languages).toEqual(['por']);
    expect(result.emptyPages).toBe(0);
  });

  it('when a page has little text but enough to count, should not read it by image', async () => {
    const document = fakeDocument([
      { lines: digital('Um'), images: true },
      { lines: ['Uma frase curta de vinte letras.'], images: true },
    ]);

    await extractorWith(document).extract(writePdf());

    expect(ocr.read).not.toHaveBeenCalled();
    expect(document.hasImages).not.toHaveBeenCalled();
  });

  it('when a page without text has no images (a blank page), should not start the image reading', async () => {
    const document = fakeDocument([{ lines: digital('Um') }, { lines: [], images: false }]);

    const result = await extractorWith(document).extract(writePdf());

    expect(ocr.read).not.toHaveBeenCalled();
    expect(result.ocrPages).toBe(0);
    expect(result.languages).toEqual([]);
    expect(result.emptyPages).toBe(1);
  });

  it('when the image reading discards pages (photos), should count them as empty and as discarded', async () => {
    const document = fakeDocument([
      { lines: digital('Um') },
      { lines: [], images: true },
      { lines: [], images: true },
    ]);

    ocr.read.mockResolvedValue(
      outcome({ texts: new Map([[2, scanned('Dois')]]), discardedPages: [3] }),
    );

    const result = await extractorWith(document).extract(writePdf());

    expect(result.ocrPages).toBe(1);
    expect(result.ocrDiscardedPages).toBe(1);
    expect(result.emptyPages).toBe(1);
  });

  it('when the whole document is scanned and the image reading finds nothing, should fail with NO_TEXT', async () => {
    const document = fakeDocument([
      { lines: [], images: true },
      { lines: [], images: true },
    ]);

    ocr.read.mockResolvedValue(outcome({ discardedPages: [1, 2] }));

    await expect(extractorWith(document).extract(writePdf())).rejects.toMatchObject({
      problem: PdfProblem.NO_TEXT,
      message: PdfMessages.noText,
    });
    expect(document.close).toHaveBeenCalled();
  });

  it('when a scanned document is read, should hand its pages to the image reading keyed by the file content', async () => {
    const document = fakeDocument([{ lines: [], images: true }]);

    ocr.read.mockResolvedValue(outcome({ texts: new Map([[1, scanned('Um')]]) }));

    await extractorWith(document).extract(writePdf());

    const request = ocr.read.mock.calls[0][0] as OcrReadRequest;

    expect(request.fileKey).toMatch(/^[a-f0-9]{24}$/);
    expect(request.document).toBe(document);
  });

  it('when more pages need image reading than the limit, should fail before reading any', async () => {
    const pages = Array.from({ length: PdfLimits.MAX_OCR_PAGES + 1 }, () => ({
      lines: [] as string[],
      images: true,
    }));

    await expect(extractorWith(fakeDocument(pages)).extract(writePdf())).rejects.toMatchObject({
      problem: PdfProblem.TOO_MANY_OCR_PAGES,
      message: PdfMessages.tooManyOcrPages(PdfLimits.MAX_OCR_PAGES + 1),
    });
    expect(ocr.read).not.toHaveBeenCalled();
  });

  it('when the pages needing image reading are exactly at the limit, should read them', async () => {
    const pages = Array.from({ length: PdfLimits.MAX_OCR_PAGES }, () => ({
      lines: [] as string[],
      images: true,
    }));

    ocr.read.mockResolvedValue(outcome({ texts: new Map([[1, scanned('Um')]]) }));

    await extractorWith(fakeDocument(pages)).extract(writePdf());

    expect(ocr.read).toHaveBeenCalledTimes(1);
  });

  it('when the image reading reports its stages and pages, should forward them as progress', async () => {
    const document = fakeDocument([
      { lines: digital('Um') },
      { lines: [], images: true },
      { lines: [], images: true },
    ]);
    const onProgress = jest.fn();

    ocr.read.mockImplementation(async (request: OcrReadRequest) => {
      request.hooks?.onStage?.('language');
      request.hooks?.onStage?.('recognize');
      request.hooks?.onProgress?.(1, 2);
      request.hooks?.onProgress?.(2, 2);

      return outcome({ texts: new Map([[2, scanned('Dois')]]) });
    });

    await extractorWith(document).extract(writePdf(), { onProgress });

    expect(onProgress.mock.calls.slice(3)).toEqual([
      [0, 0, 'language'],
      [0, 0, 'recognize'],
      [1, 2, 'recognize'],
      [2, 2, 'recognize'],
    ]);
  });

  it('when the app cancels, should let the image reading know', async () => {
    const document = fakeDocument([{ lines: digital('Um') }, { lines: [], images: true }]);
    const isCancelled = jest.fn().mockReturnValue(false);

    ocr.read.mockImplementation(async (request: OcrReadRequest) => {
      expect(request.hooks?.isCancelled?.()).toBe(false);

      return outcome({ texts: new Map([[2, scanned('Dois')]]) });
    });

    await extractorWith(document).extract(writePdf(), { isCancelled });

    expect(isCancelled).toHaveBeenCalled();
  });

  it('when there is no image reading configured, should keep only the digital text', async () => {
    const document = fakeDocument([{ lines: digital('Um') }, { lines: [], images: true }]);

    const result = await extractorWith(document, undefined).extract(writePdf());

    expect(result.ocrPages).toBe(0);
    expect(result.emptyPages).toBe(1);
  });

  it('when the document cannot draw its pages, should not try the image reading', async () => {
    const document = fakeDocument([{ lines: digital('Um') }, { lines: [], images: true }], {
      render: false,
    });

    await extractorWith(document).extract(writePdf());

    expect(ocr.read).not.toHaveBeenCalled();
  });

  it('when the image reading fails, should pass its error on and close the document', async () => {
    const document = fakeDocument([{ lines: digital('Um') }, { lines: [], images: true }]);
    const error = new Error('falha no reconhecimento');

    ocr.read.mockRejectedValue(error);

    await expect(extractorWith(document).extract(writePdf())).rejects.toBe(error);
    expect(document.close).toHaveBeenCalled();
  });
});
