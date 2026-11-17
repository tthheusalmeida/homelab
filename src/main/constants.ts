/** Esquema e host do protocolo que serve o front empacotado (origem `app://front`). */
export const APP_SCHEME = 'app';
export const APP_HOST = 'front';
export const APP_ORIGIN = `${APP_SCHEME}://${APP_HOST}`;
export const APP_ENTRY_URL = `${APP_ORIGIN}/`;
export const INDEX_FILE = 'index.html';

/** Seção das Configurações aberta sozinha na primeira execução sem chave do Gemini. */
export const FIRST_RUN_SETTINGS_SECTION = 'external';

/** Variáveis de ambiente lidas pelo main (todas opcionais, exceto onde dito). */
export const MainEnv = {
  FRONT_URL: 'HOMELAB_FRONT_URL',
  FRONT_DIST_DIR: 'HOMELAB_FRONT_DIST_DIR',
  USER_DATA_DIR: 'HOMELAB_USER_DATA_DIR',
  /** Troca a raiz dos dados (só desenvolvimento e testes): evita escrever em Documentos/HomeLab. */
  DATA_ROOT_DIR: 'HOMELAB_DATA_ROOT_DIR',
} as const;

/** Arquivos que ficam em userData (segredos cifrados com a chave do usuário do sistema: não portáveis). */
export const DataFiles = {
  secrets: 'secrets.json',
  /** Qual modelo do Whisper está em uso (ver `components/components.service.ts`). */
  components: 'components.json',
} as const;

/** Pasta-raiz padrão dos dados do HomeLab, dentro de Documentos. */
export const DATA_ROOT_FOLDER = 'HomeLab';

/** Fundos iguais aos do tema (grafite e cinza claro), para a janela não piscar na cor errada ao abrir. */
export const WINDOW_BACKGROUNDS = { dark: '#1b1b1b', light: '#f1f1f1' } as const;

export const windowBackground = (dark: boolean): string =>
  dark ? WINDOW_BACKGROUNDS.dark : WINDOW_BACKGROUNDS.light;

/** Tela de abertura (colmeia carregando): janelinha sem moldura, enquanto o app prepara tudo. */
export const SPLASH_PATH = '/splash.html';

export const SPLASH_WINDOW = {
  width: 340,
  height: 240,
  title: 'HomeLab',
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
