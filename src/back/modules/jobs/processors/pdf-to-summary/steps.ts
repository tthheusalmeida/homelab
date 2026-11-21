export const PdfToSummarySteps = {
  READ_PDF: {
    name: 'read-pdf',
    label: 'Ler texto do PDF',
  },

  SUMMARIZE_PARTS: {
    name: 'summarize-parts',
    label: 'Resumir partes',
  },

  FILL_PAGE: {
    name: 'fill-page',
    label: 'Preencher dados da página',
  },

  SAVE_FILE: {
    name: 'save-file',
    label: 'Salvar resumo',
  },

  CLEAN_UP: {
    name: 'clean-up',
    label: 'Limpar arquivos temporários',
  },
} as const;

export const PdfToSummaryPipeline = [
  PdfToSummarySteps.READ_PDF,
  PdfToSummarySteps.SUMMARIZE_PARTS,
  PdfToSummarySteps.FILL_PAGE,
  PdfToSummarySteps.SAVE_FILE,
  PdfToSummarySteps.CLEAN_UP,
];
