import { randomUUID } from 'node:crypto';

import type { PdfExtraction } from '../back/modules/pdf/pdf-extractor';

/** Quantos PDFs lidos ficam na memória esperando o usuário criar a página (os mais antigos saem). */
export const MAX_PDF_SESSIONS = 3;

export interface PdfSession {
  /** Caminho no disco: só o main o conhece, o renderer recebe o token. */
  filePath: string;
  fileName: string;
  extraction: PdfExtraction;
}

/**
 * Guarda o texto lido de um PDF até a página ser criada, identificado por um token. Assim o renderer
 * nunca manda caminho de arquivo e o PDF não é lido duas vezes (ao inspecionar e ao criar).
 */
export class PdfSessionStore {
  private readonly sessions = new Map<string, PdfSession>();

  put(session: PdfSession): string {
    const token = randomUUID();

    this.sessions.set(token, session);

    while (this.sessions.size > MAX_PDF_SESSIONS) {
      const oldest = this.sessions.keys().next().value as string;

      this.sessions.delete(oldest);
    }

    return token;
  }

  get(token: string): PdfSession | undefined {
    return this.sessions.get(token);
  }

  discard(token: string): void {
    this.sessions.delete(token);
  }
}
