import type { PdfWarning } from '../../../shared/contracts/pdf';
import { CHARS_PER_TOKEN } from '../../../shared/tokens';

/** A partir daqui o documento é "grande": vale avisar que leva tempo e gasta bastante IA. */
export const LARGE_DOCUMENT_TOKENS = 60_000;

/** A partir desta fração de páginas sem texto o aviso passa de informação para atenção. */
const MANY_EMPTY_RATIO = 0.2;

export interface PdfWarningInput {
  pageCount: number;
  emptyPages: number;
  characters: number;
  parts: number;
}

/** Avisos antes de criar a página, em português e sem citar ferramentas internas. */
export function buildPdfWarnings(input: PdfWarningInput): PdfWarning[] {
  const warnings: PdfWarning[] = [
    {
      code: 'IMAGES_IGNORED',
      level: 'info',
      message:
        'Só o texto do PDF é lido. Imagens, gráficos e tabelas desenhadas como imagem não entram no resultado.',
    },
    {
      code: 'LAYOUT_MAY_SCRAMBLE',
      level: 'info',
      message:
        'Páginas com várias colunas, tabelas, legendas ou notas de rodapé podem sair com o texto fora de ordem.',
    },
  ];

  if (input.emptyPages > 0) {
    const many = input.emptyPages / input.pageCount >= MANY_EMPTY_RATIO;

    warnings.push({
      code: 'PAGES_WITHOUT_TEXT',
      level: many ? 'warning' : 'info',
      message:
        input.emptyPages === 1
          ? '1 página não tem texto (imagem ou digitalizada) e ficou de fora.'
          : `${input.emptyPages} páginas não têm texto (imagens ou digitalizadas) e ficaram de fora.`,
    });
  }

  const tokens = Math.ceil(input.characters / CHARS_PER_TOKEN);

  if (tokens >= LARGE_DOCUMENT_TOKENS) {
    warnings.push({
      code: 'LARGE_DOCUMENT',
      level: 'warning',
      message:
        `Documento grande (~${Math.round(tokens / 1000)} mil tokens, estimativa): o texto será dividido em ` +
        `${input.parts} partes, o processo demora e consome bastante da IA escolhida.`,
    });
  }

  return warnings;
}
