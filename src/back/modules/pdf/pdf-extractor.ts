import { open as openFile, stat } from 'node:fs/promises';

import { PdfLimits, type PdfReadStage } from '../../../shared/contracts/pdf';
import type { OcrLanguageId } from './ocr/ocr-languages';
import { hashFile } from './ocr/ocr-page-cache';
import type { OcrReadRequest, OcrReadResult } from './ocr/ocr-page-reader';
import { cleanPages } from './pdf-clean';
import type { PdfDocumentHandle, PdfOpener } from './pdf-opener.port';
import { PdfMessages, PdfProblem, PdfReadError } from './pdf-read.error';

/** Abaixo disso (no documento todo) o PDF é tratado como "sem texto" (escaneado ou só imagens). */
export const MIN_DOCUMENT_CHARS = 200;

/** Página com menos texto digital que isto (e com imagem) é lida por reconhecimento de imagem. */
export const MIN_PAGE_TEXT_CHARS = 20;

/** Porta do reconhecimento de texto em imagens (o `OcrPageReader`; os testes usam um falso). */
export interface PdfOcr {
  read(request: OcrReadRequest): Promise<OcrReadResult>;
}

const PDF_MAGIC = '%PDF-';

export interface PdfExtraction {
  sizeBytes: number;
  pageCount: number;
  /** Texto limpo de cada página, em ordem; vazio quando a página não tinha texto. */
  pages: string[];
  /** Páginas que ficaram sem texto (inclusive as lidas por imagem que não deram texto confiável). */
  emptyPages: number;
  /** Páginas sem texto digital que o reconhecimento de imagem leu com sucesso. */
  ocrPages: number;
  /** Páginas lidas por imagem, mas sem texto confiável (foto, arte). */
  ocrDiscardedPages: number;
  /** Idiomas descobertos para o reconhecimento; vazio quando nenhuma página precisou dele. */
  languages: OcrLanguageId[];
  characters: number;
}

export interface PdfExtractHooks {
  /** Chamado a cada página lida (`done` de `total`) e a cada mudança de etapa (`total` 0). */
  onProgress?: (done: number, total: number, stage: PdfReadStage) => void;
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
    /** Sem ele, páginas sem texto digital ficam de fora (só o texto do PDF é lido). */
    private readonly ocr?: PdfOcr,
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
        hooks.onProgress?.(page, document.pageCount, 'text');
        await this.yieldTurn();
      }

      const recognized = await this.recognizeImagePages(filePath, document, rawPages, hooks);

      return this.finish(cleanPages(rawPages), sizeBytes, recognized);
    } finally {
      await document.close().catch(() => undefined);
    }
  }

  /**
   * Lê por reconhecimento de imagem só as páginas que precisam: sem texto digital **e** com imagem
   * (página em branco não gasta tempo). O texto dessas páginas entra em `rawPages`, no lugar vazio.
   */
  private async recognizeImagePages(
    filePath: string,
    document: PdfDocumentHandle,
    rawPages: string[][],
    hooks: PdfExtractHooks,
  ): Promise<OcrOutcome> {
    const none: OcrOutcome = { recognized: 0, discarded: 0, languages: [] };

    if (!this.ocr || !document.renderPage || !document.hasImages) {
      return none;
    }

    const pages: number[] = [];

    for (let index = 0; index < rawPages.length; index += 1) {
      if (this.isTextless(rawPages[index]) && (await document.hasImages(index + 1))) {
        pages.push(index + 1);
      }
    }

    if (pages.length === 0) {
      return none;
    }

    if (pages.length > PdfLimits.MAX_OCR_PAGES) {
      throw new PdfReadError(
        PdfProblem.TOO_MANY_OCR_PAGES,
        PdfMessages.tooManyOcrPages(pages.length),
      );
    }

    const result = await this.ocr.read({
      fileKey: await hashFile(filePath),
      document,
      pages,
      knownText: rawPages.map((lines) => lines.join(' ')).join('\n'),
      hooks: {
        isCancelled: hooks.isCancelled,
        onStage: (stage) => hooks.onProgress?.(0, 0, stage),
        onProgress: (done, total) => hooks.onProgress?.(done, total, 'recognize'),
      },
    });

    for (const [page, lines] of result.texts) {
      rawPages[page - 1] = lines;
    }

    return {
      recognized: result.texts.size,
      discarded: result.discardedPages.length,
      languages: result.languages,
    };
  }

  private isTextless(lines: string[]): boolean {
    return lines.join(' ').trim().length < MIN_PAGE_TEXT_CHARS;
  }

  private finish(pages: string[], sizeBytes: number, ocr: OcrOutcome): PdfExtraction {
    const characters = pages.reduce((total, text) => total + text.length, 0);

    if (characters < MIN_DOCUMENT_CHARS) {
      throw new PdfReadError(PdfProblem.NO_TEXT, PdfMessages.noText);
    }

    return {
      sizeBytes,
      pageCount: pages.length,
      pages,
      emptyPages: pages.filter((text) => !text.trim()).length,
      ocrPages: ocr.recognized,
      ocrDiscardedPages: ocr.discarded,
      languages: ocr.languages,
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

interface OcrOutcome {
  recognized: number;
  discarded: number;
  languages: OcrLanguageId[];
}
