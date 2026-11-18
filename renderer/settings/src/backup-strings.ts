import type {
  BackupExclusionId,
  BackupItemId,
  BackupItemKind,
  RestoreMode,
} from '#shared/contracts/backup';

/** Textos da seção Backup das Configurações (interface em português). */
export const BackupStrings = {
  createTitle: 'Criar backup',
  createHint: 'Escolha o que entra no arquivo .zip. Páginas e livros ficam juntos na biblioteca.',
  restoreTitle: 'Restaurar backup',
  restoreHint: 'Escolha um .zip criado pelo HomeLab, veja o que há nele e decida o que restaurar.',

  loadError: 'Não foi possível calcular o tamanho do backup.',
  retry: 'Tentar de novo',
  total: (original: string, zip: string) =>
    `Tamanho original ${original} · zip estimado em ${zip} (estimativa: o valor real só se sabe depois de compactar)`,
  nothingSelected: 'Marque pelo menos um item.',
  emptyItem: 'vazio',

  notIncludedTitle: 'O que NÃO entra no backup',

  create: 'Criar backup…',
  creating: 'Criando backup',
  cancel: 'Cancelar',
  cancelling: 'Cancelando…',
  created: (size: string) => `Backup criado (${size})`,
  createdAt: (path: string) => `Salvo em ${path}`,
  createCancelled: 'Backup cancelado. Nenhum arquivo foi criado.',

  choose: 'Escolher backup…',
  choosing: 'Abrindo…',
  backupFrom: (date: string, version: string) =>
    version ? `Criado em ${date} · HomeLab ${version}` : `Criado em ${date}`,
  modeTitle: 'Como restaurar',
  restore: 'Restaurar',
  restoring: 'Restaurando',
  confirmReplaceTitle: 'Substituir os dados atuais?',
  confirmReplace:
    'Os itens marcados serão trocados pelos do backup. Antes disso o HomeLab guarda uma cópia do que existe hoje, e desfaz tudo se algo falhar no meio.',
  confirmReplaceLabel: 'Substituir',
  done: 'Restauração concluída',
  resultLine: (label: string, added: number, skipped: number) =>
    skipped > 0
      ? `${label}: ${added} adicionado(s), ${skipped} mantido(s) como estavam`
      : `${label}: ${added} adicionado(s)`,
  safetyCopy: (path: string) => `Cópia do que havia antes: ${path}`,
  geminiReminder: 'A chave do Gemini não vem no backup: informe-a de novo em IAs externas.',
  restoreAnother: 'Escolher outro backup',

  progress: {
    preparing: 'Preparando',
    running: (processed: number, total: number) => `Processando ${processed} de ${total} arquivos`,
    verifying: 'Conferindo e aplicando',
    label: 'Progresso',
  },
} as const;

export const ITEM_LABELS: Record<BackupItemId, { label: string; hint: string }> = {
  library: { label: 'Biblioteca', hint: 'Páginas e livros' },
  inbox: { label: 'Classificação', hint: 'Páginas aguardando classificação' },
  jobs: { label: 'Jobs', hint: 'Histórico de processos' },
  chats: { label: 'Chats', hint: 'Todas as conversas' },
  usage: { label: 'Consumo de IA', hint: 'Histórico de tokens e custo' },
  settings: { label: 'Aparência e configurações', hint: 'Tema, cor e endereço do Ollama' },
};

export const EXCLUSION_LABELS: Record<BackupExclusionId, string> = {
  secrets: 'Chaves de API (como a do Gemini): ficam só neste computador e não vão para backup.',
  temp: 'Arquivos temporários de vídeo e áudio.',
  'ai-binaries': 'Os programas de transcrição, seus modelos e os modelos do Ollama.',
  preferences: 'Preferências de tela (como o layout dos livros).',
  'library-path': 'O caminho da pasta da biblioteca: ele é de cada computador.',
};

export const MODE_LABELS: Record<RestoreMode, { label: string; hint: string }> = {
  merge: {
    label: 'Mesclar',
    hint: 'Adiciona o que falta e mantém tudo o que já existe. Não apaga nem sobrescreve nada. As configurações atuais ficam como estão.',
  },
  replace: {
    label: 'Substituir',
    hint: 'Troca os itens marcados pelo conteúdo do backup. Guarda uma cópia do que havia antes.',
  },
};

/** "12 arquivos" ou "3 registros", conforme o tipo do item. */
export function countLabel(kind: BackupItemKind, count: number): string {
  if (kind === 'files') {
    return count === 1 ? '1 arquivo' : `${count} arquivos`;
  }

  return count === 1 ? '1 registro' : `${count} registros`;
}
