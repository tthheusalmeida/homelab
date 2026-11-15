/** Esquema e host do protocolo que serve o front empacotado (origem `app://front`). */
export const APP_SCHEME = 'app';
export const APP_HOST = 'front';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
export const APP_ENTRY_URL = `${APP_ORIGIN}/`;
export const INDEX_FILE = 'index.html';

/** Janela de Configurações: no build vive em app://front/settings/; em dev, no servidor do Vite dela. */
export const SETTINGS_BUILD_PATH = '/settings/index.html';
export const DEFAULT_SETTINGS_DEV_URL = 'http://localhost:5174';

/** Variáveis de ambiente lidas pelo main (todas opcionais, exceto onde dito). */
export const MainEnv = {
  FRONT_URL: 'HOMELAB_FRONT_URL',
  FRONT_DIST_DIR: 'HOMELAB_FRONT_DIST_DIR',
  USER_DATA_DIR: 'HOMELAB_USER_DATA_DIR',
  SETTINGS_URL: 'HOMELAB_SETTINGS_URL',
} as const;

/** Arquivos de dados do usuário (dentro de userData). */
export const DataFiles = {
  settings: 'settings.json',
  secrets: 'secrets.json',
} as const;

/** Pasta-raiz padrão dos dados do HomeLab, dentro de Documentos. */
export const DATA_ROOT_FOLDER = 'HomeLab';

/** Fundo escuro igual ao do tema, para a janela não piscar branca ao abrir. */
export const WINDOW_BACKGROUND = '#0a0a0a';

export const SETTINGS_WINDOW = {
  width: 1000,
  height: 740,
  minWidth: 780,
  minHeight: 560,
  title: 'Configurações',
} as const;

export const WINDOW = {
  width: 1280,
  height: 800,
  minWidth: 900,
  minHeight: 600,
} as const;

export const Messages = {
  frontDistMissing: 'Build do front não encontrado. Rode "npm run build:front".',
  startupErrorTitle: 'Erro ao iniciar o HomeLab',
} as const;
