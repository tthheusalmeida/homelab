import type { PdfWarning } from '../../../shared/contracts/pdf';
import { CHARS_PER_TOKEN } from '../../../shared/tokens';

/** A partir daqui o documento é "grande": vale avisar que leva tempo e gasta bastante IA. */
export const LARGE_DOCUMENT_TOKENS = 60_000;

/** A partir desta fração de páginas sem texto o aviso passa de informação para atenção. */
const MANY_EMPTY_RATIO = 0.2;

/** A partir de tantas páginas lidas por imagem o reconhecimento já leva alguns minutos. */
export const SLOW_OCR_PAGES = 100;

export interface PdfWarningInput {
  pageCount: number;
  emptyPages: number;
  characters: number;
  parts: number;
  /** Páginas lidas por reconhecimento de imagem (com texto) e as que o reconhecimento descartou. */
  ocrPages?: number;
  ocrDiscardedPages?: number;
  /** Idiomas descobertos, em português. */
  languages?: string[];
}

/** Avisos antes de criar a página, em português e sem citar ferramentas internas. */
export function buildPdfWarnings(input: PdfWarningInput): PdfWarning[] {
  const warnings: PdfWarning[] = [
    {
      code: 'IMAGES_IGNORED',
      level: 'info',
      message:
        'Só o texto do PDF é lido (inclusive o de páginas escaneadas). Fotos, gráficos e tabelas desenhadas como imagem não entram no resultado.',
    },
    {
      code: 'LAYOUT_MAY_SCRAMBLE',
      level: 'info',
      message:
        'Páginas com várias colunas, tabelas, legendas ou notas de rodapé podem sair com o texto fora de ordem.',
    },
  ];

  warnings.push(...buildOcrWarnings(input));

  // as páginas que o reconhecimento de imagem descartou já têm o próprio aviso
  const emptyPages = input.emptyPages - (input.ocrDiscardedPages ?? 0);

  if (emptyPages > 0) {
    const many = emptyPages / input.pageCount >= MANY_EMPTY_RATIO;

    warnings.push({
      code: 'PAGES_WITHOUT_TEXT',
      level: many ? 'warning' : 'info',
      message:
        emptyPages === 1
          ? '1 página não tem texto (imagem ou digitalizada) e ficou de fora.'
          : `${emptyPages} páginas não têm texto (imagens ou digitalizadas) e ficaram de fora.`,
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

const listOf = (items: string[]): string =>
  items.length > 1
    ? `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`
    : (items[0] ?? '');

const pagesOf = (count: number): string => (count === 1 ? '1 página' : `${count} páginas`);

/** Avisos do reconhecimento de texto em imagens: o que foi lido assim, o que ficou de fora e o tempo. */
function buildOcrWarnings(input: PdfWarningInput): PdfWarning[] {
  const read = input.ocrPages ?? 0;
  const discarded = input.ocrDiscardedPages ?? 0;
  const warnings: PdfWarning[] = [];

  if (read > 0) {
    const languages = input.languages?.length ? ` Idioma: ${listOf(input.languages)}.` : '';

    warnings.push({
      code: 'OCR_USED',
      level: 'info',
      message:
        `${pagesOf(read)} não tinham texto digital e foram lidas a partir da imagem (reconhecimento de texto).${languages} ` +
        'Pode haver erros de leitura, principalmente em letras pequenas, tabelas e manuscritos.',
    });
  }

  if (discarded > 0) {
    warnings.push({
      code: 'OCR_DISCARDED',
      level: 'warning',
      message: `${pagesOf(discarded)} ${discarded === 1 ? 'é' : 'são'} imagem ou foto sem texto legível (capas, fotos, artes) e ${discarded === 1 ? 'ficou' : 'ficaram'} de fora do resumo.`,
    });
  }

  if (read + discarded >= SLOW_OCR_PAGES) {
    warnings.push({
      code: 'OCR_SLOW',
      level: 'warning',
      message: `Ler ${read + discarded} páginas por imagem é demorado e foi feito agora, ao escolher o arquivo. O resultado fica salvo: escolher o mesmo PDF de novo não repete o trabalho.`,
    });
  }

  return warnings;
}
