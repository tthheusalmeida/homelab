import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import type { PdfDocumentHandle } from '../pdf-opener.port';
import { PdfMessages, PdfProblem } from '../pdf-read.error';
import type { OcrEngine, OcrLanguagePacks, OcrLines } from './ocr-engine.port';
import type { OcrLanguageId } from './ocr-languages';
import { OcrPageCache } from './ocr-page-cache';
import {
  FALLBACK_LANGUAGES,
  OcrPageReader,
  pickSamplePages,
  type OcrReadHooks,
  type OcrStage,
} from './ocr-page-reader';

const KEY = 'b'.repeat(24);

const line = (text: string): OcrLines[number] =>
  text.split(' ').map((w) => ({ text: w, confidence: 95 }));

const PT = 'A psicologia comunitária estuda a relação das pessoas com o território onde elas vivem';
const FR = 'Les élèves doivent écrire un projet pour la communauté qui sera remis à la fin';

describe('pickSamplePages', () => {
  it('when there are few pages, should use all of them', () => {
    expect(pickSamplePages([3, 7], 4)).toEqual([3, 7]);
  });

  it('when there are many pages, should spread the samples across the document', () => {
    expect(pickSamplePages([1, 2, 3, 4, 5, 6, 7, 8], 4)).toEqual([2, 4, 6, 8]);
  });

  it('when the pages are not consecutive, should pick from the ones given', () => {
    const picked = pickSamplePages([10, 20, 30, 40, 50, 60, 70, 80, 90, 100], 4);

    expect(picked).toHaveLength(4);
    expect(picked.every((page) => page % 10 === 0)).toBe(true);
  });
});

describe('OcrPageReader', () => {
  let dir: string;
  let cache: OcrPageCache;
  let installed: Set<OcrLanguageId>;
  let opens: OcrLanguageId[][];
  let closes: number;
  let recognized: number[];
  let pageText: Record<number, OcrLines>;
  let ensure: jest.Mock;
  let engine: OcrEngine;
  let packs: OcrLanguagePacks;
  let renderPage: jest.Mock;
  let document: PdfDocumentHandle;

  const reader = () => new OcrPageReader({ engine, packs, cache });
  const read = (pages: number[], hooks: OcrReadHooks = {}, knownText = '') =>
    reader().read({ fileKey: KEY, document, pages, knownText, hooks });

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ocr-reader-spec-'));
    cache = new OcrPageCache(dir);
    installed = new Set<OcrLanguageId>(['eng', 'por']);
    opens = [];
    closes = 0;
    recognized = [];
    pageText = {};
    ensure = jest.fn(async (languages: readonly OcrLanguageId[]) => {
      languages.forEach((language) => installed.add(language));
    });
    packs = {
      locate: (language) =>
        installed.has(language) ? { file: `/x/${language}`, quality: 'fast' } : null,
      ensure,
    };
    engine = {
      open: async (languages) => {
        opens.push([...languages]);

        return {
          signature: `${languages.join('+')}:fast`,
          recognize: async (image) => {
            recognized.push(image[0]);

            return pageText[image[0]] ?? [];
          },
          close: async () => {
            closes += 1;
          },
        };
      },
    };
    renderPage = jest.fn(async (page: number) => new Uint8Array([page]));
    document = { pageCount: 100, readPage: jest.fn(), renderPage, close: jest.fn() };
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when pages need reading, should find the language from a sample and read every page with it', async () => {
    for (const page of [1, 2, 3, 4, 5, 6, 7, 8]) {
      pageText[page] = [line(PT)];
    }

    const result = await read([1, 2, 3, 4, 5, 6, 7, 8]);

    expect(result.languages).toEqual(['por']);
    expect([...result.texts.keys()]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(result.discardedPages).toEqual([]);
    expect(opens).toEqual([['eng'], ['por']]);
    expect(closes).toBe(2);
  });

  it('when the document mixes two languages, should open the engine with both', async () => {
    // as páginas 2, 4, 6 e 8 são as da amostra: metade em cada idioma
    [1, 2, 3, 4, 5, 6, 7, 8].forEach((page) => {
      pageText[page] = [line(page <= 4 ? PT : FR)];
    });

    const result = await read([1, 2, 3, 4, 5, 6, 7, 8]);

    expect(new Set(result.languages)).toEqual(new Set(['por', 'fra']));
  });

  it('when the text already read on digital pages shows the language, should count it too', async () => {
    pageText[1] = [line('1 2 3')];

    const result = await read([1], {}, `${PT}. ${PT}. ${PT}.`);

    expect(result.languages).toEqual(['por']);
  });

  it('when no language can be told, should fall back to the default languages', async () => {
    const result = await read([1, 2]);

    expect(result.languages).toEqual([...FALLBACK_LANGUAGES]);
    expect(opens[1]).toEqual([...FALLBACK_LANGUAGES]);
  });

  it('when the detected language is not installed, should ask the packs to install it before reading', async () => {
    installed = new Set<OcrLanguageId>(['eng']);
    [1, 2].forEach((page) => (pageText[page] = [line(FR)]));

    const result = await read([1, 2]);

    expect(ensure).toHaveBeenCalledWith(['fra']);
    expect(result.languages).toEqual(['fra']);
  });

  it('when nothing is missing, should not touch the downloads', async () => {
    await read([1]);

    expect(ensure).not.toHaveBeenCalled();
  });

  it('when the sample language is missing, should install it first and announce the download', async () => {
    installed = new Set<OcrLanguageId>();
    const stages: OcrStage[] = [];

    await read([1], { onStage: (stage) => stages.push(stage) });

    expect(ensure).toHaveBeenNthCalledWith(1, ['eng']);
    expect(stages).toEqual(['language', 'download', 'language', 'download', 'recognize']);
  });

  it('when announcing the work, should go from language to recognition and report each page', async () => {
    [1, 2, 3].forEach((page) => (pageText[page] = [line(PT)]));
    const stages: OcrStage[] = [];
    const progress: Array<[number, number]> = [];

    await read([1, 2, 3], {
      onStage: (stage) => stages.push(stage),
      onProgress: (done, total) => progress.push([done, total]),
    });

    expect(stages).toEqual(['language', 'recognize']);
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('when a page has no reliable text (a photo), should list it as discarded and not return text for it', async () => {
    pageText[1] = [line(PT)];
    pageText[2] = [[{ text: 'ruído', confidence: 20 }]];

    const result = await read([1, 2]);

    expect(result.discardedPages).toEqual([2]);
    expect(result.texts.has(2)).toBe(false);
  });

  it('when the same file is read again, should take every page from the disk and not render or recognize again', async () => {
    [1, 2, 3, 4].forEach((page) => (pageText[page] = [line(PT)]));
    await read([1, 2, 3, 4]);
    renderPage.mockClear();
    recognized.length = 0;

    const again = await read([1, 2, 3, 4]);

    expect(renderPage).not.toHaveBeenCalled();
    expect(recognized).toEqual([]);
    expect([...again.texts.keys()]).toEqual([1, 2, 3, 4]);
  });

  it('when a discarded page was cached, should not read it again', async () => {
    pageText[1] = [line(PT)];
    pageText[2] = [];
    await read([1, 2]);
    renderPage.mockClear();

    await read([1, 2]);

    expect(renderPage).not.toHaveBeenCalled();
  });

  it('when the cached page came from other languages or quality, should read it again', async () => {
    pageText[1] = [line(PT)];
    await cache.write(KEY, 'page', 1, { signature: 'fra:best', lines: ['velho'], confidence: 99 });

    const result = await read([1]);

    expect(result.texts.get(1)).toEqual([PT]);
  });

  it('when reading is cancelled between pages, should stop with CANCELLED and close the engine', async () => {
    pageText[1] = [line(PT)];
    let calls = 0;

    await expect(read([1, 2, 3], { isCancelled: () => ++calls > 3 })).rejects.toMatchObject({
      problem: PdfProblem.CANCELLED,
    });
    expect(closes).toBe(opens.length);
  });

  it('when the document cannot draw pages, should fail with OCR_UNAVAILABLE', async () => {
    document = { pageCount: 1, readPage: jest.fn(), close: jest.fn() };

    await expect(read([1])).rejects.toMatchObject({
      problem: PdfProblem.OCR_UNAVAILABLE,
      message: PdfMessages.ocrUnavailable,
    });
  });

  it('when the language data cannot be installed, should fail with OCR_UNAVAILABLE and the reason', async () => {
    installed = new Set<OcrLanguageId>();
    ensure.mockRejectedValue(new Error('sem internet'));

    await expect(read([1])).rejects.toMatchObject({
      problem: PdfProblem.OCR_UNAVAILABLE,
      message: PdfMessages.ocrLanguageFailed('sem internet'),
    });
  });

  it('when recognizing fails, should still close the engine', async () => {
    renderPage.mockRejectedValue(new Error('falha ao desenhar'));

    await expect(read([1])).rejects.toThrow('falha ao desenhar');
    expect(closes).toBe(opens.length);
  });
});
