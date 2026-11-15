/** Fase de uma operação longa que informa progresso (backup, mover a biblioteca...). */
export type ProgressPhase = 'preparing' | 'running' | 'verifying' | 'done';

/** Payload dos eventos `*:progress`: quantos itens (arquivos) já foram processados do total. */
export interface ProgressEventPayload {
  phase: ProgressPhase;
  processed: number;
  total: number;
  /** Arquivo em processamento (caminho relativo), quando faz sentido mostrar. */
  currentFile?: string;
}

export type NoticeLevel = 'info' | 'warning' | 'error';

/** Aviso global ao usuário (evento `app:notice`): job que falhou, processos interrompidos etc. */
export interface AppNotice {
  id: string;
  level: NoticeLevel;
  title: string;
  message?: string;
  /** Detalhe técnico, mostrado só em "ver detalhes". */
  detail?: string;
  /** Rota do app para onde o aviso leva (ex.: a tela de Jobs). */
  link?: { label: string; path: string };
}
