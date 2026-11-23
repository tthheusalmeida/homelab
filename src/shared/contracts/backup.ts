/** O que pode entrar num backup. Cada item é uma caixa de seleção na tela. */
export type BackupItemId =
  | 'library'
  | 'inbox'
  | 'jobs'
  | 'chats'
  | 'mindMaps'
  | 'infographics'
  | 'prompts'
  | 'usage'
  | 'settings';

export const BACKUP_ITEM_IDS: readonly BackupItemId[] = [
  'library',
  'inbox',
  'jobs',
  'chats',
  'mindMaps',
  'infographics',
  'prompts',
  'usage',
  'settings',
];

/** O que **não** entra no backup (a tela avisa antes de criar). */
export type BackupExclusionId = 'secrets' | 'temp' | 'ai-binaries' | 'preferences' | 'library-path';

/** `files`: arquivos de uma pasta (biblioteca, entrada); `records`: registros de uma coleção (jobs, chats...). */
export type BackupItemKind = 'files' | 'records';

export interface BackupItemPreview {
  id: BackupItemId;
  kind: BackupItemKind;
  count: number;
  /** Tamanho original, em bytes. */
  bytes: number;
  /** Estimativa do tamanho dentro do zip (a compactação real só se sabe depois de criar). */
  estimatedZipBytes: number;
}

export interface BackupPreview {
  items: BackupItemPreview[];
  notIncluded: BackupExclusionId[];
}

export interface BackupCreateRequest {
  items: BackupItemId[];
}

/** Resultado de `backup:create`. `cancelled` vale quando o usuário fechou o diálogo ou cancelou no meio. */
export interface BackupCreateResult {
  cancelled: boolean;
  path?: string;
  /** Tamanho real do zip criado. */
  bytes?: number;
  files?: number;
}

export interface BackupInspectionItem {
  id: BackupItemId;
  kind: BackupItemKind;
  count: number;
  bytes: number;
}

/** Conteúdo de um backup escolhido para restaurar (lido só do `manifest.json`). */
export interface BackupInspection {
  /** Identifica o arquivo escolhido nas chamadas seguintes (o renderer nunca manda caminhos). */
  token: string;
  fileName: string;
  createdAt: string;
  appVersion: string;
  items: BackupInspectionItem[];
}

/** `merge` adiciona o que falta e mantém o atual; `replace` troca pelo conteúdo do backup. */
export type RestoreMode = 'merge' | 'replace';

/** O que aconteceu ao importar uma coleção (jobs, chats, consumo): quantos entraram e quantos já existiam. */
export interface RecordImportResult {
  added: number;
  skipped: number;
}

export interface BackupRestoreRequest {
  token: string;
  items: BackupItemId[];
  mode: RestoreMode;
}

export interface BackupRestoreItemResult {
  id: BackupItemId;
  added: number;
  /** Itens que já existiam e foram mantidos (modo mesclar). */
  skipped: number;
}

export interface BackupRestoreResult {
  items: BackupRestoreItemResult[];
  /** Pasta com a cópia do que havia antes (só em `replace`, quando algo foi substituído). */
  safetyCopyPath: string | null;
  /** Algum valor restaurado só vale depois de reiniciar (ex.: o endereço do Ollama). */
  restartRequired: boolean;
}
