import type { Appearance, AppearancePatch } from './appearance';

/**
 * Única pasta que o usuário escolhe: onde ficam as páginas e os livros. Inbox, temporários e dados
 * do app são fixos, dentro da raiz `Documentos/HomeLab` (ver `docs/persistencia.md`).
 */
export interface SettingsPaths {
  libraryDir: string;
}

/** Whisper local: valores fixos do app (não aparece nas configurações nem no `settings.json`). */
export interface WhisperConfig {
  directory: string;
  executable: string;
  model: string;
}

/** Ollama local (antes: OLLAMA_URL). */
export interface OllamaConfig {
  url: string;
}

export interface SettingsData {
  paths: SettingsPaths;
  appearance: Appearance;
  local: {
    ollama: OllamaConfig;
  };
}

export type SettingsPatch = {
  paths?: Partial<SettingsPaths>;
  appearance?: AppearancePatch;
  local?: {
    ollama?: Partial<OllamaConfig>;
  };
};

/** Resposta de toda gravação: o que ficou salvo e se é preciso reiniciar para aplicar. */
export interface SaveResult<T> {
  value: T;
  restartRequired: boolean;
}

/** O que há numa pasta candidata a biblioteca (canal `settings:inspect-library`). */
export interface LibraryFolderInfo {
  path: string;
  exists: boolean;
  /** Não existe ou não tem nenhum arquivo ou pasta dentro. */
  empty: boolean;
  fileCount: number;
}

/** `move`: leva a biblioteca atual para a nova pasta (vazia); `use`: só passa a usar a pasta como está. */
export type LibraryMoveMode = 'move' | 'use';

export interface MoveLibraryRequest {
  to: string;
  mode: LibraryMoveMode;
  /** Só vale em `move`: apaga a pasta antiga depois de conferir a cópia. */
  deleteOrigin?: boolean;
}

export interface MoveLibraryResult {
  libraryDir: string;
  filesCopied: number;
  bytesCopied: number;
  originRemoved: boolean;
  /** Por que a pasta antiga não foi apagada (a mudança em si deu certo). */
  originRemoveError?: string;
  restartRequired: boolean;
}
