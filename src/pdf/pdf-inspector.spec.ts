import type { PdfExtraction } from '../back/modules/pdf/pdf-extractor';
import { PdfMessages, PdfProblem, PdfReadError } from '../back/modules/pdf/pdf-read.error';
import { IpcEvents } from '../shared/events';
import { PDF_FILE_FILTERS, PdfInspector } from './pdf-inspector';
import { PdfSessionStore } from './pdf-session.store';

const extraction = (overrides: Partial<PdfExtraction> = {}): PdfExtraction => ({
  sizeBytes: 2048,
  pageCount: 4,
  pages: ['a'.repeat(400), 'b'.repeat(400), '', 'c'.repeat(400)],
  emptyPages: 1,
  ocrPages: 0,
  ocrDiscardedPages: 0,
  languages: [],
  characters: 1200,
  ...overrides,
});

function setup(options: { path?: string | null; extract?: jest.Mock } = {}) {
  const pickOpenPath = jest
    .fn()
    .mockResolvedValue(options.path === undefined ? 'D:/docs/Livro.pdf' : options.path);
  const extract = options.extract ?? jest.fn().mockResolvedValue(extraction());
  const publish = jest.fn();
  const sessions = new PdfSessionStore();
  const inspector = new PdfInspector({
    filePicker: { pickOpenPath },
    extractor: { extract },
    sessions,
    events: { publish },
  });

  return { inspector, pickOpenPath, extract, publish, sessions };
}

describe('PdfInspector', () => {
  it('when the dialog opens, should only offer pdf files', async () => {
    const { inspector, pickOpenPath } = setup();

    await inspector.inspect();

    expect(pickOpenPath).toHaveBeenCalledWith({ filters: PDF_FILE_FILTERS });
    expect(PDF_FILE_FILTERS).toEqual([{ name: 'PDF', extensions: ['pdf'] }]);
  });

  it('when the user cancels the dialog, should answer null and read nothing', async () => {
    const { inspector, extract } = setup({ path: null });

    await expect(inspector.inspect()).resolves.toBeNull();
    expect(extract).not.toHaveBeenCalled();
  });

  it('when the file is read, should describe it with sizes, estimates and warnings', async () => {
    const { inspector } = setup();

    const result = await inspector.inspect();

    expect(result).toMatchObject({
      fileName: 'Livro.pdf',
      sizeBytes: 2048,
      pageCount: 4,
      emptyPages: 1,
      characters: 1200,
      estimatedTokens: 300,
      parts: 1,
      estimatedCalls: 2,
    });
    expect(result?.warnings.map((w) => w.code)).toEqual([
      'IMAGES_IGNORED',
      'LAYOUT_MAY_SCRAMBLE',
      'PAGES_WITHOUT_TEXT',
    ]);
  });

  it('when the file is read, should never expose the file path to the renderer', async () => {
    const { inspector } = setup();

    const result = await inspector.inspect();

    expect(JSON.stringify(result)).not.toContain('D:/docs');
  });

  it('when the file is read, should keep the text in memory under the token', async () => {
    const { inspector, sessions } = setup();

    const result = await inspector.inspect();
    const session = sessions.get(result!.token);

    expect(session?.filePath).toBe('D:/docs/Livro.pdf');
    expect(session?.extraction.pageCount).toBe(4);
  });

  it('when the text is big, should estimate more parts and one extra call', async () => {
    const big = extraction({
      pages: Array.from({ length: 10 }, () => 'p'.repeat(20_000)),
      characters: 300_000,
      pageCount: 10,
      emptyPages: 0,
    });
    const { inspector } = setup({ extract: jest.fn().mockResolvedValue(big) });

    const result = await inspector.inspect();

    expect(result!.parts).toBeGreaterThan(5);
    expect(result!.estimatedCalls).toBe(result!.parts + 1);
    expect(result!.warnings.map((w) => w.code)).toContain('LARGE_DOCUMENT');
  });

  it('when pages are read, should publish progress and end with done', async () => {
    const extract = jest.fn(
      async (
        _file: string,
        hooks: { onProgress?: (d: number, t: number, stage: 'text') => void },
      ) => {
        hooks.onProgress?.(1, 4, 'text');
        hooks.onProgress?.(2, 4, 'text');

        return extraction();
      },
    );
    const { inspector, publish } = setup({ extract });

    await inspector.inspect();

    expect(publish.mock.calls).toEqual([
      [IpcEvents.pdfProgress, { phase: 'preparing', processed: 0, total: 0, stage: 'text' }],
      [IpcEvents.pdfProgress, { phase: 'running', processed: 1, total: 4, stage: 'text' }],
      [IpcEvents.pdfProgress, { phase: 'running', processed: 2, total: 4, stage: 'text' }],
      [IpcEvents.pdfProgress, { phase: 'done', processed: 4, total: 4, stage: 'text' }],
    ]);
  });

  it('when pages were read from images, should show how many, the languages by name and the warnings', async () => {
    const extract = jest.fn().mockResolvedValue(
      extraction({
        emptyPages: 3,
        ocrPages: 20,
        ocrDiscardedPages: 3,
        languages: ['por', 'fra'],
      }),
    );
    const { inspector } = setup({ extract });

    const result = await inspector.inspect();

    expect(result!.ocrPages).toBe(20);
    expect(result!.languages).toEqual(['Português', 'Francês']);
    expect(result!.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['OCR_USED', 'OCR_DISCARDED']),
    );
    expect(result!.warnings.map((w) => w.code)).not.toContain('PAGES_WITHOUT_TEXT');
  });

  it('when no page needed image reading, should list no languages and no image warnings', async () => {
    const { inspector } = setup();

    const result = await inspector.inspect();

    expect(result!.ocrPages).toBe(0);
    expect(result!.languages).toEqual([]);
    expect(result!.warnings.map((w) => w.code)).not.toContain('OCR_USED');
  });

  it('when the reading moves through language, download and recognition, should publish each stage', async () => {
    const extract = jest.fn(
      async (
        _file: string,
        hooks: { onProgress?: (d: number, t: number, s: 'language' | 'recognize') => void },
      ) => {
        hooks.onProgress?.(0, 0, 'language');
        hooks.onProgress?.(3, 20, 'recognize');

        return extraction();
      },
    );
    const { inspector, publish } = setup({ extract });

    await inspector.inspect();

    expect(publish.mock.calls.map(([, payload]) => [payload.phase, payload.stage])).toEqual([
      ['preparing', 'text'],
      ['running', 'language'],
      ['running', 'recognize'],
      ['done', 'text'],
    ]);
  });

  it('when reading is cancelled, should answer null and keep nothing in memory', async () => {
    const holder: { inspector?: PdfInspector } = {};
    const extract = jest.fn(async (_file: string, hooks: { isCancelled?: () => boolean }) => {
      holder.inspector?.cancel();

      if (hooks.isCancelled?.()) {
        throw new PdfReadError(PdfProblem.CANCELLED, PdfMessages.cancelled);
      }

      return extraction();
    });
    const ctx = setup({ extract });

    holder.inspector = ctx.inspector;
    const put = jest.spyOn(ctx.sessions, 'put');

    await expect(ctx.inspector.inspect()).resolves.toBeNull();
    expect(put).not.toHaveBeenCalled();
  });

  it('when a new reading starts after a cancel, should not carry the cancel over', async () => {
    const { inspector } = setup();

    inspector.cancel();

    await expect(inspector.inspect()).resolves.not.toBeNull();
  });

  it('when the file has a problem, should pass the error on and free the reader for the next try', async () => {
    const error = new PdfReadError(PdfProblem.NO_TEXT, PdfMessages.noText);
    const extract = jest.fn().mockRejectedValueOnce(error).mockResolvedValue(extraction());
    const { inspector } = setup({ extract });

    await expect(inspector.inspect()).rejects.toBe(error);
    await expect(inspector.inspect()).resolves.not.toBeNull();
  });

  it('when another reading is in progress, should refuse with BUSY', async () => {
    let release!: () => void;
    const extract = jest.fn(
      () =>
        new Promise<PdfExtraction>((resolve) => {
          release = () => resolve(extraction());
        }),
    );
    const { inspector } = setup({ extract });

    const first = inspector.inspect();

    await expect(inspector.inspect()).rejects.toMatchObject({ problem: PdfProblem.BUSY });

    await new Promise((resolve) => setImmediate(resolve));
    release();
    await first;
  });
});
