import type { MigrationChoice, MigrationPlan } from './legacy-migration';

export const MigrationPromptText = {
  title: 'HomeLab',
  message: 'O HomeLab agora guarda seus dados em uma pasta só',
  intro: 'Encontrei dados da versão anterior:',
  library: (dir: string) => `• Biblioteca (páginas e livros): ${dir}`,
  inbox: (dir: string) => `• Entrada: ${dir}`,
  usage: '• Histórico de consumo de IA',
  outro: (root: string) =>
    `Nada é apagado: os arquivos antigos continuam onde estão até você removê-los. A nova pasta é ${root}.`,
  move: 'Mover tudo para a nova pasta',
  keep: 'Manter a biblioteca onde está',
  later: 'Agora não',
  laterHint:
    '"Agora não" abre o HomeLab com a biblioteca de sempre e pergunta de novo na próxima abertura; a entrada e o histórico antigos só aparecem depois da migração.',
  failedTitle: 'Não foi possível migrar seus dados',
  warningTitle: 'Migração concluída com avisos',
} as const;

export interface MigrationPrompt {
  message: string;
  detail: string;
  /** Botões na ordem de `MIGRATION_CHOICES`. */
  buttons: string[];
}

/** Ordem dos botões do diálogo, que é também o índice devolvido pelo Electron. */
export const MIGRATION_CHOICES: readonly MigrationChoice[] = ['move', 'keep', 'later'];

/** Monta o texto do diálogo de migração a partir do que existe no formato antigo. */
export function describeMigration(plan: MigrationPlan): MigrationPrompt {
  const found = [
    plan.libraryDir ? MigrationPromptText.library(plan.libraryDir) : null,
    plan.inboxDir ? MigrationPromptText.inbox(plan.inboxDir) : null,
    plan.hasUsage ? MigrationPromptText.usage : null,
  ].filter((line): line is string => line !== null);

  return {
    message: MigrationPromptText.message,
    detail: [
      MigrationPromptText.intro,
      ...found,
      '',
      MigrationPromptText.outro(plan.newRootDir),
      '',
      MigrationPromptText.laterHint,
    ].join('\n'),
    buttons: [MigrationPromptText.move, MigrationPromptText.keep, MigrationPromptText.later],
  };
}

/** Escolha a partir do botão clicado (fechar o diálogo vale como "agora não"). */
export function choiceFromButton(index: number): MigrationChoice {
  return MIGRATION_CHOICES[index] ?? 'later';
}
