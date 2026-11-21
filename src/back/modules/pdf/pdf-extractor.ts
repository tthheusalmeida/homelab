import { open as openFile, stat } from 'node:fs/promises';

import { PdfLimits } from '../../../shared/contracts/pdf';
import { cleanPages } from './pdf-clean';
import type { PdfOpener } from './pdf-opener.port';
import { PdfMessages, PdfProblem, PdfReadError } from './pdf-read.error';

/** Abaixo disso (no documento todo) o PDF é tratado como "sem texto" (escaneado ou só imagens). */
export const MIN_DOCUMENT_CHARS = 200;

const PDF_MAGIC = '%PDF-';

export interface PdfExtraction {
  sizeBytes: number;
  pageCount: number;
  /** Texto limpo de cada página, em ordem; vazio quando a página não tinha texto. */
  pages: string[];
  emptyPages: number;
  characters: number;
}

export interface PdfExtractHooks {
  /** Chamado a cada página lida (`done` de `total`). */
  onProgress?: (done: number, total: number) => void;
  /** Consultado entre as páginas; `true` interrompe a leitura (`CANCELLED`). */
  isCancelled?: () => boolean;
}

const nextTurn = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/**
 * Lê o texto de um PDF: confere o arquivo (existe, tamanho, cabeçalho `%PDF`), lê **uma página por
 * vez** devolvendo o controle ao app entre elas (o app não trava em livros grandes), limpa o texto e
 * recusa documentos sem texto. Só o texto é lido; imagens e gráficos ficam de fora.
 */
export class PdfExtractor {
  constructor(
    private readonly opener: PdfOpener,
    private readonly yieldTurn: () => Promise<void> = nextTurn,
  ) {}

  /** Confere o arquivo antes de abrir: existência, tamanho e se começa como um PDF. */
  async validateFile(filePath: string): Promise<number> {
    let size: number;

    try {
      size = (await stat(filePath)).size;
    } catch {
      throw new PdfReadError(PdfProblem.NOT_FOUND, PdfMessages.notFound);
    }

    if (size > PdfLimits.MAX_BYTES) {
      throw new PdfReadError(PdfProblem.TOO_LARGE, PdfMessages.tooLarge(size));
    }

    if (!(await this.startsAsPdf(filePath))) {
      throw new PdfReadError(PdfProblem.NOT_PDF, PdfMessages.notPdf);
    }

    return size;
  }

  async extract(filePath: string, hooks: PdfExtractHooks = {}): Promise<PdfExtraction> {
    const sizeBytes = await this.validateFile(filePath);

    const document = await this.opener.open(filePath);

    try {
      if (document.pageCount > PdfLimits.MAX_PAGES) {
        throw new PdfReadError(
          PdfProblem.TOO_MANY_PAGES,
          PdfMessages.tooManyPages(document.pageCount),
        );
      }

      const rawPages: string[][] = [];

      for (let page = 1; page <= document.pageCount; page += 1) {
        if (hooks.isCancelled?.()) {
          throw new PdfReadError(PdfProblem.CANCELLED, PdfMessages.cancelled);
        }

        rawPages.push(await document.readPage(page));
        hooks.onProgress?.(page, document.pageCount);
        await this.yieldTurn();
      }

      return this.finish(cleanPages(rawPages), sizeBytes);
    } finally {
      await document.close().catch(() => undefined);
    }
  }

  private finish(pages: string[], sizeBytes: number): PdfExtraction {
    const characters = pages.reduce((total, text) => total + text.length, 0);

    if (characters < MIN_DOCUMENT_CHARS) {
      throw new PdfReadError(PdfProblem.NO_TEXT, PdfMessages.noText);
    }

    return {
      sizeBytes,
      pageCount: pages.length,
      pages,
      emptyPages: pages.filter((text) => !text.trim()).length,
      characters,
    };
  }

  private async startsAsPdf(filePath: string): Promise<boolean> {
    const file = await openFile(filePath, 'r').catch(() => null);

    if (!file) {
      throw new PdfReadError(PdfProblem.NOT_FOUND, PdfMessages.notFound);
    }

    try {
      const buffer = Buffer.alloc(1024);
      const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);

      // a especificação aceita lixo antes do cabeçalho, nos primeiros 1024 bytes
      return buffer.subarray(0, bytesRead).toString('latin1').includes(PDF_MAGIC);
    } finally {
      await file.close();
    }
  }
}
