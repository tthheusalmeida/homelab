import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import type { PdfDocumentHandle, PdfOpener } from './pdf-opener.port';
import { PdfMessages, PdfProblem, PdfReadError } from './pdf-read.error';

interface TextItem {
  str: string;
  hasEOL?: boolean;
  transform?: number[];
}

interface PdfJsViewport {
  width: number;
  height: number;
}

/** Tela de desenho (a do `@napi-rs/canvas`) onde o `pdfjs` pinta a página. */
export interface PageCanvas {
  getContext(type: '2d'): unknown;
  toBuffer(mime: 'image/png'): Uint8Array;
}

interface PdfJsPage {
  getTextContent(): Promise<{ items: Array<TextItem | object> }>;
  getOperatorList(): Promise<{ fnArray: number[] }>;
  getViewport(options: { scale: number }): PdfJsViewport;
  render(options: Record<string, unknown>): { promise: Promise<void> };
  cleanup(): void;
}

interface PdfJsDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfJsPage>;
}

interface PdfJsLoadingTask {
  promise: Promise<PdfJsDocument>;
  destroy(): Promise<void>;
}

export interface PdfJsModule {
  getDocument(options: Record<string, unknown>): PdfJsLoadingTask;
  /** Códigos das operações de desenho de uma página (para saber se ela desenha imagens). */
  OPS: {
    paintImageXObject: number;
    paintInlineImageXObject: number;
    paintImageMaskXObject: number;
  };
}

export type CanvasFactory = (width: number, height: number) => PageCanvas;

/** O `@napi-rs/canvas` (binário pronto por sistema) só é carregado quando uma página vira imagem. */
export const napiCanvasFactory: CanvasFactory = (width, height) =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- carga sob demanda do binário nativo
  (require('@napi-rs/canvas') as { createCanvas: CanvasFactory }).createCanvas(width, height);

/**
 * O `pdfjs-dist` é só ESM e o main compila em CJS: o `import()` precisa sobreviver ao compilador
 * (o `tsc` o trocaria por `require`). Por isso passa por `Function`, com o caminho absoluto.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval -- texto fixo, sem entrada de usuário
const dynamicImport = new Function('specifier', 'return import(specifier)') as (
  specifier: string,
) => Promise<PdfJsModule>;

const PDFJS_ENTRY = 'pdfjs-dist/legacy/build/pdf.mjs';

/** Diferença vertical (em pontos) a partir da qual dois trechos já são linhas diferentes. */
const LINE_TOLERANCE = 2;

export function loadPdfJs(): Promise<PdfJsModule> {
  return dynamicImport(pathToFileURL(require.resolve(PDFJS_ENTRY)).href);
}

/** Junta os trechos de uma página em linhas, na ordem em que o PDF os declara. */
export function groupLines(items: ReadonlyArray<TextItem | object>): string[] {
  const lines: string[] = [];
  let current = '';
  let currentY: number | null = null;

  const flush = (): void => {
    if (current.trim()) {
      lines.push(current);
    }

    current = '';
    currentY = null;
  };

  for (const raw of items) {
    const item = raw as TextItem;

    if (typeof item.str !== 'string') {
      continue;
    }

    const y = item.transform?.[5] ?? null;

    if (currentY !== null && y !== null && Math.abs(y - currentY) > LINE_TOLERANCE) {
      flush();
    }

    current += item.str;
    currentY = y ?? currentY;

    if (item.hasEOL) {
      flush();
    }
  }

  flush();

  return lines;
}

function mapOpenError(error: unknown): PdfReadError {
  const name = (error as { name?: string } | null)?.name;

  if (name === 'PasswordException') {
    return new PdfReadError(PdfProblem.ENCRYPTED, PdfMessages.encrypted);
  }

  return new PdfReadError(PdfProblem.CORRUPT, PdfMessages.corrupt);
}

/** Abre PDFs com o `pdfjs-dist` (Mozilla), que roda no Node e lê só o texto. */
export class PdfJsOpener implements PdfOpener {
  constructor(
    private readonly load: () => Promise<PdfJsModule> = loadPdfJs,
    private readonly createCanvas: CanvasFactory = napiCanvasFactory,
  ) {}

  async open(filePath: string): Promise<PdfDocumentHandle> {
    const pdfjs = await this.load();
    const data = new Uint8Array(await readFile(filePath));
    const task = pdfjs.getDocument({
      data,
      // Segurança e leveza: sem scripts do PDF, sem fontes extras e sem avisos no console.
      isEvalSupported: false,
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    });
    let document: PdfJsDocument;

    try {
      document = await task.promise;
    } catch (error) {
      await task.destroy().catch(() => undefined);

      throw mapOpenError(error);
    }

    const createCanvas = this.createCanvas;

    return {
      pageCount: document.numPages,

      async readPage(pageNumber: number): Promise<string[]> {
        try {
          const page = await document.getPage(pageNumber);
          const content = await page.getTextContent();

          page.cleanup();

          return groupLines(content.items);
        } catch (error) {
          throw mapOpenError(error);
        }
      },

      async hasImages(pageNumber: number): Promise<boolean> {
        try {
          const page = await document.getPage(pageNumber);
          const operators = await page.getOperatorList();

          page.cleanup();

          const { paintImageXObject, paintInlineImageXObject, paintImageMaskXObject } = pdfjs.OPS;

          return operators.fnArray.some(
            (operator) =>
              operator === paintImageXObject ||
              operator === paintInlineImageXObject ||
              operator === paintImageMaskXObject,
          );
        } catch (error) {
          throw mapOpenError(error);
        }
      },

      async renderPage(pageNumber: number, longEdgePx: number): Promise<Uint8Array> {
        try {
          const page = await document.getPage(pageNumber);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({
            scale: longEdgePx / Math.max(base.width, base.height),
          });
          const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));

          await page.render({ canvasContext: canvas.getContext('2d'), viewport, canvas }).promise;
          page.cleanup();

          return canvas.toBuffer('image/png');
        } catch (error) {
          throw mapOpenError(error);
        }
      },

      // a liberação é da tarefa de carregamento: ela encerra o documento e o leitor interno
      close: async () => {
        await task.destroy();
      },
    };
  }
}
