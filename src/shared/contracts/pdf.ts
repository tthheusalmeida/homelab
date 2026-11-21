/** Limites da leitura de PDF (valem no main; a tela só os mostra). */
export const PdfLimits = {
  /** Tamanho máximo do arquivo: 50 MB. */
  MAX_BYTES: 50 * 1024 * 1024,
  /** Número máximo de páginas lidas. */
  MAX_PAGES: 1500,
} as const;

export type PdfWarningCode =
  'IMAGES_IGNORED' | 'LAYOUT_MAY_SCRAMBLE' | 'PAGES_WITHOUT_TEXT' | 'LARGE_DOCUMENT';

/** Aviso mostrado antes de criar a página (a mensagem já vem pronta, em português). */
export interface PdfWarning {
  code: PdfWarningCode;
  /** `info` é só para saber; `warning` pede atenção antes de seguir. */
  level: 'info' | 'warning';
  message: string;
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
  characters: number;
  /** Estimativa (caracteres ÷ 4), não um número exato. */
  estimatedTokens: number;
  /** Quantas partes o texto será dividido para a IA. */
  parts: number;
  /** Chamadas à IA previstas: uma por parte, mais a final que preenche a página. */
  estimatedCalls: number;
  warnings: PdfWarning[];
}
