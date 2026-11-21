/** Um PDF aberto: lê uma página por vez para nunca guardar o documento inteiro na memória. */
export interface PdfDocumentHandle {
  readonly pageCount: number;
  /** Linhas de texto da página (1 a `pageCount`), na ordem de leitura. */
  readPage(pageNumber: number): Promise<string[]>;
  close(): Promise<void>;
}

/** Porta de abertura de PDF; a implementação real usa a biblioteca, os testes usam um falso. */
export interface PdfOpener {
  /** Lança `PdfReadError` (`ENCRYPTED`, `CORRUPT`) quando o arquivo não pode ser lido. */
  open(filePath: string): Promise<PdfDocumentHandle>;
}
