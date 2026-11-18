/**
 * Onde o app está no ciclo de atualização. `ready`: a versão nova já foi baixada (só a diferença) e
 * será instalada ao reiniciar ou ao fechar o app.
 */
export type UpdateState =
  'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'installing';

/** Uma versão publicada no GitHub (o que o usuário vê; endereços de download ficam no main). */
export interface UpdateRelease {
  version: string;
  /** Notas da versão (Markdown, o texto do Release). */
  notes: string;
  /** Página do Release (abre no navegador do sistema). */
  url: string;
  publishedAt: string | null;
}

export interface UpdateStatus {
  state: UpdateState;
  currentVersion: string;
  /** Versão mais nova que a instalada; `null` quando está em dia ou ainda não se sabe. */
  latest: UpdateRelease | null;
  /** 0 a 100 durante o download. */
  progress: number;
  /** Mensagem em português do último erro; o estado volta ao que era (a versão nova continua em `latest`). */
  error: string | null;
  /** Quando a última verificação terminou (ms desde 1970); `null` se ainda não verificou. */
  checkedAt: number | null;
  /**
   * Se o app verifica atualizações. `false` no app não empacotado (execução de desenvolvimento): lá
   * nada é consultado nem avisado, só o app instalado recebe o aviso.
   */
  enabled: boolean;
  /** Se o app consegue baixar e aplicar a atualização sozinho (hoje só no Windows). */
  canInstall: boolean;
  /** Verificar sozinho ao abrir e a cada 6 horas (preferência `updates.autoCheck`). */
  autoCheck: boolean;
}

/** Resposta de `updates:translation-available`: há IA local (Ollama ligado com modelo de texto). */
export interface TranslationAvailability {
  available: boolean;
}

/** Resposta de `updates:translate-notes`: as notas da versão nova em português. */
export interface TranslatedNotes {
  version: string;
  /** Markdown traduzido. */
  notes: string;
}

/** Corpo de `updates:set-auto-check`. */
export interface SetAutoCheckRequest {
  autoCheck: boolean;
}
