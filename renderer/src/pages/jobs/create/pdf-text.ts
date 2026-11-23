/** Textos do formulário "Resumo de PDF" (interface em português). */
export const PdfStrings = {
  fileLabel: 'Arquivo PDF',
  choose: 'Escolher PDF',
  chooseAnother: 'Escolher outro PDF',
  onlyPdf:
    'Só arquivos PDF são aceitos, com até 50 MB e 1500 páginas. O texto do documento é lido; imagens e gráficos não.',
  reading: 'Lendo o PDF…',
  readingPages: (done: number, total: number) =>
    total > 0 ? `Lendo página ${done} de ${total}` : 'Abrindo o arquivo…',
  cancelRead: 'Cancelar leitura',
  readCancelled: 'Leitura cancelada.',

  facts: {
    pages: 'Páginas',
    size: 'Tamanho',
    tokens: 'Texto (estimativa)',
    parts: 'Partes',
    calls: 'Chamadas à IA',
  },
  tokens: (tokens: number) => `~${tokens.toLocaleString('pt-BR')} tokens`,
  parts: (parts: number) => (parts === 1 ? '1 parte' : `${parts} partes`),
  callsHint: 'uma por parte, mais uma final',

  /** Onde o texto será processado, conforme o provedor escolhido. */
  sendsTo: (providerId: string | undefined) =>
    providerId === 'ollama'
      ? 'O texto do PDF será processado no Ollama, no seu computador.'
      : providerId === 'gemini'
        ? 'O texto do PDF será enviado ao Gemini, um serviço externo. Não envie documentos que não possam sair do seu computador.'
        : providerId === 'anthropic'
          ? 'O texto do PDF será enviado à Anthropic, um serviço externo. Não envie documentos que não possam sair do seu computador.'
          : 'Escolha o serviço de IA: o texto do PDF será enviado a ele.',
  resumeHint:
    'O progresso fica salvo em disco. Se o app fechar, o limite de uso acabar ou o computador desligar, use “Tentar de novo” em Acompanhar para continuar de onde parou, até com outro modelo.',

  defaultTitle: 'Resumo de PDF',
  submit: 'Criar resumo do PDF',
} as const;
