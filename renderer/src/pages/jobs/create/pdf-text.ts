import { profileOf } from '#lib/ai-providers';

import type { PdfReadProgress } from './hooks/useInspectPdf';

/** Textos do formulário "Resumo de PDF" (interface em português). */
export const PdfStrings = {
  fileLabel: 'Arquivo PDF',
  choose: 'Escolher PDF',
  chooseAnother: 'Escolher outro PDF',
  onlyPdf:
    'Só arquivos PDF são aceitos, com até 50 MB e 1500 páginas. O texto do documento é lido, inclusive o de páginas escaneadas; fotos e gráficos não.',
  reading: 'Lendo o PDF…',
  readingPages: (done: number, total: number) =>
    total > 0 ? `Lendo página ${done} de ${total}` : 'Abrindo o arquivo…',
  detectingLanguage: 'Identificando o idioma do documento…',
  downloadingLanguage: 'Baixando os dados do idioma (só na primeira vez)…',
  recognizingPages: (done: number, total: number) =>
    total > 0
      ? `Reconhecendo o texto da página ${done} de ${total} (páginas escaneadas)`
      : 'Preparando o reconhecimento de texto…',
  recognizeHint:
    'Páginas escaneadas demoram mais. O que já foi reconhecido fica salvo: se cancelar ou fechar o app, escolher o mesmo PDF continua de onde parou.',
  cancelRead: 'Cancelar leitura',
  readCancelled: 'Leitura cancelada.',

  facts: {
    pages: 'Páginas',
    size: 'Tamanho',
    tokens: 'Texto (estimativa)',
    parts: 'Partes',
    calls: 'Chamadas à IA',
    languages: 'Idioma',
    ocrPages: 'Lidas por imagem',
  },
  languages: (names: string[]) => names.join(', '),
  ocrPages: (count: number) => (count === 1 ? '1 página' : `${count} páginas`),
  ocrPagesHint: 'Páginas escaneadas, lidas por reconhecimento de texto na imagem',
  tokens: (tokens: number) => `~${tokens.toLocaleString('pt-BR')} tokens`,
  parts: (parts: number) => (parts === 1 ? '1 parte' : `${parts} partes`),
  callsHint: 'uma por parte, mais uma final',

  /** Onde o texto será processado, conforme o provedor escolhido. */
  sendsTo: (providerId: string | undefined) => {
    const profile = profileOf(providerId);

    if (!profile) {
      return 'Escolha o serviço de IA: o texto do PDF será enviado a ele.';
    }

    return profile.sentTo
      ? `O texto do PDF será enviado ${profile.sentTo}, um serviço externo. Não envie documentos que não possam sair do seu computador.`
      : `O texto do PDF será processado no ${profile.name}, no seu computador.`;
  },
  resumeHint:
    'O progresso fica salvo em disco. Se o app fechar, o limite de uso acabar ou o computador desligar, use “Tentar de novo” em Acompanhar para continuar de onde parou, até com outro modelo.',

  defaultTitle: 'Resumo de PDF',
  submit: 'Criar resumo do PDF',
} as const;

/** Texto do progresso da leitura conforme a etapa em andamento. */
export function readProgressText(progress: PdfReadProgress | null): string {
  if (!progress) {
    return PdfStrings.reading;
  }

  switch (progress.stage) {
    case 'language':
      return PdfStrings.detectingLanguage;
    case 'download':
      return PdfStrings.downloadingLanguage;
    case 'recognize':
      return PdfStrings.recognizingPages(progress.done, progress.total);
    default:
      return PdfStrings.readingPages(progress.done, progress.total);
  }
}
