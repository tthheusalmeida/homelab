import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { PdfProblem } from './pdf-read.error';
import { PdfJsOpener, type PageCanvas, type PdfJsModule } from './pdfjs-opener';

const OPS = { paintImageXObject: 85, paintInlineImageXObject: 86, paintImageMaskXObject: 83 };
const TEXT_OP = 44;

describe('PdfJsOpener drawing', () => {
  let dir: string;
  let file: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdfjs-render-spec-'));
    file = path.join(dir, 'a.pdf');
    fs.writeFileSync(file, '%PDF-1.4');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const open = async (page: Record<string, unknown>, createCanvas = jest.fn()) => {
    const document = { numPages: 1, getPage: jest.fn().mockResolvedValue(page) };
    const module = {
      OPS,
      getDocument: () => ({ promise: Promise.resolve(document), destroy: jest.fn() }),
    } as unknown as PdfJsModule;

    return {
      handle: await new PdfJsOpener(() => Promise.resolve(module), createCanvas).open(file),
      createCanvas,
    };
  };

  describe('hasImages', () => {
    it.each([
      ['an image', OPS.paintImageXObject],
      ['an inline image', OPS.paintInlineImageXObject],
      ['an image mask', OPS.paintImageMaskXObject],
    ])('when the page paints %s, should say it has images', async (_name, operator) => {
      const { handle } = await open({
        getOperatorList: async () => ({ fnArray: [TEXT_OP, operator] }),
        cleanup: jest.fn(),
      });

      await expect(handle.hasImages!(1)).resolves.toBe(true);
    });

    it('when the page paints only text and shapes, should say it has no images', async () => {
      const { handle } = await open({
        getOperatorList: async () => ({ fnArray: [TEXT_OP, 12, 13] }),
        cleanup: jest.fn(),
      });

      await expect(handle.hasImages!(1)).resolves.toBe(false);
    });

    it('when the page cannot be read, should fail with CORRUPT', async () => {
      const { handle } = await open({
        getOperatorList: jest.fn().mockRejectedValue(new Error('quebrada')),
        cleanup: jest.fn(),
      });

      await expect(handle.hasImages!(1)).rejects.toMatchObject({ problem: PdfProblem.CORRUPT });
    });
  });

  describe('renderPage', () => {
    const png = new Uint8Array([137, 80, 78, 71]);

    const setup = (pageSize = { width: 800, height: 500 }) => {
      const context = {};
      const canvas: PageCanvas = {
        getContext: jest.fn().mockReturnValue(context),
        toBuffer: () => png,
      };
      const createCanvas = jest.fn().mockReturnValue(canvas);
      const render = jest.fn().mockReturnValue({ promise: Promise.resolve() });
      const cleanup = jest.fn();
      const getViewport = jest.fn(({ scale }: { scale: number }) => ({
        width: pageSize.width * scale,
        height: pageSize.height * scale,
      }));

      return { createCanvas, render, cleanup, getViewport, context, canvas };
    };

    it('when drawing a wide page, should scale so the long edge has the requested pixels', async () => {
      const { createCanvas, render, cleanup, getViewport } = setup({ width: 800, height: 500 });
      const { handle } = await open({ getViewport, render, cleanup }, createCanvas);

      await handle.renderPage!(1, 2000);

      expect(createCanvas).toHaveBeenCalledWith(2000, 1250);
    });

    it('when drawing a tall page, should use the height as the long edge', async () => {
      const { createCanvas, render, cleanup, getViewport } = setup({ width: 600, height: 800 });
      const { handle } = await open({ getViewport, render, cleanup }, createCanvas);

      await handle.renderPage!(1, 2000);

      expect(createCanvas).toHaveBeenCalledWith(1500, 2000);
    });

    it('when the scaled size is fractional, should round the canvas up', async () => {
      const { createCanvas, render, cleanup, getViewport } = setup({ width: 595, height: 842 });
      const { handle } = await open({ getViewport, render, cleanup }, createCanvas);

      await handle.renderPage!(1, 2000);

      const [width, height] = createCanvas.mock.calls[0];

      expect(Number.isInteger(width)).toBe(true);
      expect(height).toBe(2000);
    });

    it('when drawing, should paint on the canvas, release the page and return the PNG bytes', async () => {
      const { createCanvas, render, cleanup, getViewport, context, canvas } = setup();
      const { handle } = await open({ getViewport, render, cleanup }, createCanvas);

      const result = await handle.renderPage!(1, 2000);

      expect(render).toHaveBeenCalledWith(
        expect.objectContaining({ canvasContext: context, canvas }),
      );
      expect(cleanup).toHaveBeenCalled();
      expect(result).toBe(png);
    });

    it('when the page cannot be drawn, should fail with CORRUPT', async () => {
      const { createCanvas, cleanup, getViewport } = setup();
      const render = jest.fn(() => ({ promise: Promise.reject(new Error('sem memória')) }));
      const { handle } = await open({ getViewport, render, cleanup }, createCanvas);

      await expect(handle.renderPage!(1, 2000)).rejects.toMatchObject({
        problem: PdfProblem.CORRUPT,
      });
    });
  });
});
