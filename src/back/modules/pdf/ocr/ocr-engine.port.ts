import type { OcrLanguageId } from './ocr-languages';

/** Uma palavra reconhecida na imagem, com a confiança (0 a 100) que o motor tem nela. */
export interface OcrWord {
  text: string;
  confidence: number;
}

/** O que o motor leu de uma página: linhas de palavras, na ordem de leitura. */
export type OcrLines = OcrWord[][];

/** Motor aberto para um conjunto de idiomas; reaproveitado de página em página. */
export interface OcrSession {
  /** Identifica motor, idiomas e qualidade: resultados em cache só valem para a mesma assinatura. */
  readonly signature: string;
  /** Lê o texto de uma imagem (PNG). */
  recognize(image: Uint8Array): Promise<OcrLines>;
  close(): Promise<void>;
}

/** Porta do reconhecimento de texto em imagens; a implementação real usa a biblioteca. */
export interface OcrEngine {
  /** Lança se algum idioma não estiver instalado. */
  open(languages: readonly OcrLanguageId[]): Promise<OcrSession>;
}

/** Idiomas instalados no computador (baixados pelo catálogo de componentes). */
export interface OcrLanguagePacks {
  /** Garante que os idiomas estão instalados, baixando o que faltar. */
  ensure(languages: readonly OcrLanguageId[]): Promise<void>;
  /** Arquivo de dados do idioma (o de alta qualidade, se instalado) e a qualidade; `null` se faltar. */
  locate(language: OcrLanguageId): { file: string; quality: 'fast' | 'best' } | null;
}
