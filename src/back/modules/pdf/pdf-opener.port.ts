/** Um PDF aberto: lê uma página por vez para nunca guardar o documento inteiro na memória. */
export interface PdfDocumentHandle {
  readonly pageCount: number;
  /** Linhas de texto da página (1 a `pageCount`), na ordem de leitura. */
  readPage(pageNumber: number): Promise<string[]>;
  /**
   * Desenha a página como imagem PNG, com o lado maior em `longEdgePx` pixels, para o
   * reconhecimento de texto. Ausente em quem não sabe desenhar (então não há reconhecimento).
   */
  renderPage?(pageNumber: number, longEdgePx: number): Promise<Uint8Array>;
  /** A página desenha alguma imagem? Página sem texto e sem imagem é só uma página em branco. */
  hasImages?(pageNumber: number): Promise<boolean>;
  close(): Promise<void>;
}

/** Porta de abertura de PDF; a implementação real usa a biblioteca, os testes usam um falso. */
export interface PdfOpener {
  /** Lança `PdfReadError` (`ENCRYPTED`, `CORRUPT`) quando o arquivo não pode ser lido. */
  open(filePath: string): Promise<PdfDocumentHandle>;
}
