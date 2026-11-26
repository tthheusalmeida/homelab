import type { ProgressEventPayload } from './events';

/** Limites da leitura de PDF (valem no main; a tela só os mostra). */
export const PdfLimits = {
  /** Tamanho máximo do arquivo: 50 MB. */
  MAX_BYTES: 50 * 1024 * 1024,
  /** Número máximo de páginas lidas. */
  MAX_PAGES: 1500,
  /** Máximo de páginas que podem precisar de reconhecimento por imagem (é a parte lenta). */
  MAX_OCR_PAGES: 500,
} as const;

export type PdfWarningCode =
  | 'IMAGES_IGNORED'
  | 'LAYOUT_MAY_SCRAMBLE'
  | 'PAGES_WITHOUT_TEXT'
  | 'LARGE_DOCUMENT'
  | 'OCR_USED'
  | 'OCR_DISCARDED'
  | 'OCR_SLOW';

/** Aviso mostrado antes de criar a página (a mensagem já vem pronta, em português). */
export interface PdfWarning {
  code: PdfWarningCode;
  /** `info` é só para saber; `warning` pede atenção antes de seguir. */
  level: 'info' | 'warning';
  message: string;
}

/** O que a leitura está fazendo: texto das páginas, descoberta do idioma, download ou reconhecimento. */
export type PdfReadStage = 'text' | 'language' | 'download' | 'recognize';

/** Evento `pdf:progress`: páginas processadas do total, na etapa em andamento. */
export interface PdfProgressPayload extends ProgressEventPayload {
  stage: PdfReadStage;
}

/** Resultado de `pdf:inspect`: o que foi lido do arquivo escolhido e o que vai custar. */
export interface PdfInspection {
  /** Identifica o arquivo lido; o renderer nunca conhece o caminho. */
  token: string;
  fileName: string;
  sizeBytes: number;
  pageCount: number;
  /** Páginas em que não havia texto para ler. */
  emptyPages: number;
  /** Páginas sem texto digital lidas por reconhecimento de imagem (e que deram texto). */
  ocrPages: number;
  /** Idiomas do documento, em português ("Português", "Francês"); vazio quando não foi preciso descobrir. */
  languages: string[];
  characters: number;
  /** Estimativa (caracteres ÷ 4), não um número exato. */
  estimatedTokens: number;
  /** Quantas partes o texto será dividido para a IA. */
  parts: number;
  /** Chamadas à IA previstas: uma por parte, mais a final que preenche a página. */
  estimatedCalls: number;
  warnings: PdfWarning[];
}
