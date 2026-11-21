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
    'Este PDF não tem texto para ler: parece ser escaneado ou feito só de imagens. ' +
    'Apenas o texto é lido, as imagens não são reconhecidas.',
  cancelled: 'Leitura cancelada.',
  busy: 'Já existe um PDF sendo lido. Aguarde terminar.',
} as const;

/** Problema esperado ao ler um PDF; chega ao usuário como `VALIDATION` com a mensagem pronta. */
export class PdfReadError extends BadRequestException {
  constructor(
    readonly problem: PdfProblem,
    message: string,
  ) {
    super(message);
  }
}
