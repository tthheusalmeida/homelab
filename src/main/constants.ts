/** Esquema e host do protocolo que serve o front empacotado (origem `app://front`). */
export const APP_SCHEME = 'app';
export const APP_HOST = 'front';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
export const APP_ENTRY_URL = `${APP_ORIGIN}/`;
export const INDEX_FILE = 'index.html';

/** Variáveis de ambiente lidas pelo main (todas opcionais, exceto onde dito). */
export const MainEnv = {
  FRONT_URL: 'HOMELAB_FRONT_URL',
  FRONT_DIST_DIR: 'HOMELAB_FRONT_DIST_DIR',
  BACK_DIR: 'HOMELAB_BACK_DIR',
  PORT: 'PORT',
  CORS_ORIGIN: 'CORS_ORIGIN',
  USER_DATA_DIR: 'HOMELAB_USER_DATA_DIR',
} as const;

/** Arquivos de dados do usuário (dentro de userData). */
export const DataFiles = {
  settings: 'settings.json',
  secrets: 'secrets.json',
} as const;

/** Pasta-raiz padrão dos dados do HomeLab, dentro de Documentos. */
export const DATA_ROOT_FOLDER = 'HomeLab';

/** Convenções do back atual (a fase 01 ainda usa o HTTP do Nest). */
export const DEFAULT_API_PORT = '3000';
export const API_PREFIX = 'api/v1';
export const HEALTH_PATH = 'health/system';
export const BACK_ENTRY_RELATIVE_PATH = ['dist', 'main.js'] as const;

/** Espera pelo back antes de abrir a janela. */
export const BACKEND_WAIT = { retries: 60, delayMs: 500 } as const;

export const WINDOW = {
  width: 1280,
  height: 800,
  minWidth: 900,
  minHeight: 600,
} as const;

export const Messages = {
  backendNotReady: 'O servidor local não respondeu a tempo.',
  backendEntryMissing: 'Build do back não encontrado. Rode "npm run build:back".',
  frontDistMissing: 'Build do front não encontrado. Rode "npm run build:front".',
  startupErrorTitle: 'Erro ao iniciar o HomeLab',
} as const;
