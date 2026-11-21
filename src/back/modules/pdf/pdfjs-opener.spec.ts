import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { groupLines, PdfJsOpener, type PdfJsModule } from './pdfjs-opener';
import { PdfMessages, PdfProblem } from './pdf-read.error';

const item = (str: string, y: number, hasEOL = false) => ({
  str,
  hasEOL,
  transform: [1, 0, 0, 1, 0, y],
});

describe('groupLines', () => {
  it('when items share the same height, should join them into one line', () => {
    expect(groupLines([item('Olá ', 700), item('mundo', 700)])).toEqual(['Olá mundo']);
  });

  it('when the height changes, should start a new line', () => {
    expect(groupLines([item('Primeira', 700), item('Segunda', 680)])).toEqual([
      'Primeira',
      'Segunda',
    ]);
  });

  it('when the height changes only slightly, should keep it on the same line', () => {
    expect(groupLines([item('a', 700), item('b', 699)])).toEqual(['ab']);
  });

  it('when an item ends the line, should start a new line after it', () => {
    expect(groupLines([item('um', 700, true), item('dois', 700)])).toEqual(['um', 'dois']);
  });

  it('when there are blank items and non-text marks, should ignore them', () => {
    expect(
      groupLines([{ type: 'beginMarkedContent' }, item('   ', 700, true), item('ok', 680)]),
    ).toEqual(['ok']);
  });

  it('when there are no items, should return no lines', () => {
    expect(groupLines([])).toEqual([]);
  });
});

describe('PdfJsOpener', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfjs-opener-'));
    file = path.join(dir, 'a.pdf');
    fs.writeFileSync(file, '%PDF-1.4');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const moduleWith = (
    makePromise: () => Promise<unknown>,
    destroy = jest.fn().mockResolvedValue(undefined),
  ) => {
    const getDocument = jest.fn().mockImplementation(() => ({ promise: makePromise(), destroy }));
    const load = jest.fn().mockResolvedValue({ getDocument } as unknown as PdfJsModule);

    return { opener: new PdfJsOpener(load), getDocument, destroy };
  };

  const pdfDocument = (pages: Array<Array<ReturnType<typeof item>>>) => ({
    numPages: pages.length,
    getPage: jest.fn(async (n: number) => ({
      getTextContent: async () => ({ items: pages[n - 1] }),
      cleanup: jest.fn(),
    })),
  });

  it('when opening, should disable script evaluation and read from the file bytes', async () => {
    const { opener, getDocument } = moduleWith(() =>
      Promise.resolve(pdfDocument([[item('x', 1)]])),
    );

    await opener.open(file);

    const options = getDocument.mock.calls[0][0];

    expect(options.isEvalSupported).toBe(false);
    expect(Buffer.from(options.data).toString()).toBe('%PDF-1.4');
  });

  it('when reading a page, should return its lines', async () => {
    const { opener } = moduleWith(() =>
      Promise.resolve(pdfDocument([[item('linha 1', 700), item('linha 2', 680)]])),
    );

    const document = await opener.open(file);

    expect(document.pageCount).toBe(1);
    await expect(document.readPage(1)).resolves.toEqual(['linha 1', 'linha 2']);
  });

  it('when closing, should destroy the loading task', async () => {
    const { opener, destroy } = moduleWith(() => Promise.resolve(pdfDocument([[item('x', 1)]])));

    await (await opener.open(file)).close();

    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('when the pdf asks for a password, should fail with ENCRYPTED', async () => {
    const { opener, destroy } = moduleWith(() =>
      Promise.reject(Object.assign(new Error('senha'), { name: 'PasswordException' })),
    );

    await expect(opener.open(file)).rejects.toMatchObject({
      problem: PdfProblem.ENCRYPTED,
      message: PdfMessages.encrypted,
    });
    expect(destroy).toHaveBeenCalled();
  });

  it('when the pdf cannot be parsed, should fail with CORRUPT', async () => {
    const { opener } = moduleWith(() =>
      Promise.reject(Object.assign(new Error('x'), { name: 'InvalidPDFException' })),
    );

    await expect(opener.open(file)).rejects.toMatchObject({ problem: PdfProblem.CORRUPT });
  });

  it('when a page cannot be read, should fail with CORRUPT', async () => {
    const broken = {
      numPages: 1,
      getPage: jest.fn().mockRejectedValue(new Error('página quebrada')),
    };
    const { opener } = moduleWith(() => Promise.resolve(broken));

    const document = await opener.open(file);

    await expect(document.readPage(1)).rejects.toMatchObject({ problem: PdfProblem.CORRUPT });
  });
});
