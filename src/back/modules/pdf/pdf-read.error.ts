import { BadRequestException } from '@nestjs/common';

import { PdfLimits } from '../../../shared/contracts/pdf';

export const PdfProblem = {
  NOT_FOUND: 'NOT_FOUND',
  NOT_PDF: 'NOT_PDF',
  TOO_LARGE: 'TOO_LARGE',
  TOO_MANY_PAGES: 'TOO_MANY_PAGES',
  ENCRYPTED: 'ENCRYPTED',
  CORRUPT: 'CORRUPT',
  NO_TEXT: 'NO_TEXT',
  TOO_MANY_OCR_PAGES: 'TOO_MANY_OCR_PAGES',
  OCR_UNAVAILABLE: 'OCR_UNAVAILABLE',
  CANCELLED: 'CANCELLED',
  BUSY: 'BUSY',
} as const;

export type PdfProblem = (typeof PdfProblem)[keyof typeof PdfProblem];

const MB = 1024 * 1024;

/** Mensagens para o usuário (sem citar bibliotecas ou ferramentas internas). */
export const PdfMessages = {
  notFound: 'Não foi possível abrir o arquivo. Ele foi movido ou apagado?',
  notPdf: 'Este arquivo não é um PDF válido.',
  tooLarge: (sizeBytes: number): string =>
    `O arquivo tem ${(sizeBytes / MB).toFixed(1)} MB e o limite é ${PdfLimits.MAX_BYTES / MB} MB. ` +
    'Divida o documento em partes menores e envie uma de cada vez.',
  tooManyPages: (pages: number): string =>
    `O PDF tem ${pages} páginas e o limite é ${PdfLimits.MAX_PAGES}. ` +
    'Divida o documento em partes menores e envie uma de cada vez.',
  encrypted: 'Este PDF é protegido por senha. Remova a proteção e tente de novo.',
  corrupt: 'O arquivo está corrompido ou incompleto e não pôde ser lido.',
  noText:
    'Não foi possível ler texto neste PDF: as páginas são imagens ou fotos sem texto legível. ' +
    'Tente um arquivo mais nítido ou com texto em vez de figuras.',
  tooManyOcrPages: (pages: number): string =>
    `${pages} páginas deste PDF precisam ser reconhecidas por imagem e o limite é ${PdfLimits.MAX_OCR_PAGES}. ` +
    'Divida o documento em partes menores e envie uma de cada vez.',
  ocrUnavailable:
    'Este PDF é escaneado e o reconhecimento de texto em imagens não está disponível.',
  ocrLanguageFailed: (reason: string): string =>
    `Este PDF é escaneado e o app precisa baixar os dados de idioma para reconhecer o texto, mas não conseguiu.${reason ? ` ${reason}` : ''} ` +
    'Confira a conexão com a internet e tente de novo.',
  cancelled: 'Leitura cancelada.',
  busy: 'Já existe um PDF sendo lido. Aguarde terminar.',
} as const;

/** Problema esperado ao ler um PDF; chega ao usuário como `VALIDATION` com a mensagem pronta. */
export class PdfReadError extends BadRequestException {
  constructor(
    readonly problem: PdfProblem,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
  }
}
