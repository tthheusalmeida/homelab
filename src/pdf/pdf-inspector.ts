import * as path from 'node:path';

import { chunkPages, type PdfChunk } from '../back/modules/pdf/pdf-chunker';
import type { PdfExtraction, PdfExtractHooks } from '../back/modules/pdf/pdf-extractor';
import { PdfMessages, PdfProblem, PdfReadError } from '../back/modules/pdf/pdf-read.error';
import { buildPdfWarnings } from '../back/modules/pdf/pdf-warnings';
import type { EventPublisher } from '../ipc/event-publisher';
import type { FilePicker } from '../ipc/file-picker';
import type { PdfInspection } from '../shared/contracts/pdf';
import { IpcEvents } from '../shared/events';
import { CHARS_PER_TOKEN } from '../shared/tokens';
import type { PdfSessionStore } from './pdf-session.store';

export const PDF_FILE_FILTERS = [{ name: 'PDF', extensions: ['pdf'] }];

/** Porta do extrator de texto. */
export interface PdfTextExtractor {
  extract(filePath: string, hooks?: PdfExtractHooks): Promise<PdfExtraction>;
}

export interface PdfInspectorDeps {
  filePicker: Pick<FilePicker, 'pickOpenPath'>;
  extractor: PdfTextExtractor;
  sessions: PdfSessionStore;
  events: EventPublisher;
  /** Divide o texto em partes (por omissão o do back; os testes trocam por um falso). */
  chunk?: (pages: string[]) => PdfChunk[];
}

/**
 * `pdf:inspect`: o usuário escolhe o PDF, o app lê o texto (com progresso e cancelamento), guarda o
 * resultado em memória e devolve o resumo do que foi lido e do que vai custar. Cancelar (no diálogo
 * ou durante a leitura) devolve `null`.
 */
export class PdfInspector {
  private cancelRequested = false;
  private reading = false;

  constructor(private readonly deps: PdfInspectorDeps) {}

  async inspect(): Promise<PdfInspection | null> {
    if (this.reading) {
      throw new PdfReadError(PdfProblem.BUSY, PdfMessages.busy);
    }

    // marcado antes do diálogo: duas chamadas seguidas não abrem dois diálogos
    this.reading = true;
    this.cancelRequested = false;

    try {
      const filePath = await this.deps.filePicker.pickOpenPath({ filters: PDF_FILE_FILTERS });

      if (!filePath) {
        return null;
      }

      this.publish('preparing', 0, 0);

      const extraction = await this.deps.extractor.extract(filePath, {
        onProgress: (done, total) => this.publish('running', done, total),
        isCancelled: () => this.cancelRequested,
      });

      const inspection = this.describe(filePath, extraction);

      this.publish('done', extraction.pageCount, extraction.pageCount);

      return inspection;
    } catch (error) {
      if (error instanceof PdfReadError && error.problem === PdfProblem.CANCELLED) {
        return null;
      }

      throw error;
    } finally {
      this.reading = false;
    }
  }

  /** Pede para interromper a leitura em andamento (entre duas páginas). */
  cancel(): void {
    this.cancelRequested = true;
  }

  private describe(filePath: string, extraction: PdfExtraction): PdfInspection {
    const chunk = this.deps.chunk ?? ((pages: string[]) => chunkPages(pages));
    const parts = chunk(extraction.pages).length;
    const fileName = path.basename(filePath);
    const token = this.deps.sessions.put({ filePath, fileName, extraction });

    return {
      token,
      fileName,
      sizeBytes: extraction.sizeBytes,
      pageCount: extraction.pageCount,
      emptyPages: extraction.emptyPages,
      characters: extraction.characters,
      estimatedTokens: Math.ceil(extraction.characters / CHARS_PER_TOKEN),
      parts,
      estimatedCalls: parts + 1,
      warnings: buildPdfWarnings({
        pageCount: extraction.pageCount,
        emptyPages: extraction.emptyPages,
        characters: extraction.characters,
        parts,
      }),
    };
  }

  private publish(phase: 'preparing' | 'running' | 'done', processed: number, total: number): void {
    this.deps.events.publish(IpcEvents.pdfProgress, { phase, processed, total });
  }
}
