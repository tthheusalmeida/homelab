import type { Appearance } from './appearance';

/** Pastas usadas pelo app (antes: LIB_DIR, TEMP_DOCS_DIR, TEMP_VIDEO_DIR, TEMP_AUDIO_DIR). */
export interface SettingsPaths {
  libraryDir: string;
  inboxDir: string;
  videoTempDir: string;
  audioTempDir: string;
}

/** Whisper local (antes: WHISPER_DIR, WHISPER_EXECUTABLE, WHISPER_MODEL). */
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
    whisper: WhisperConfig;
    ollama: OllamaConfig;
  };
}

export type SettingsPatch = {
  paths?: Partial<SettingsPaths>;
  appearance?: Partial<Appearance>;
  local?: {
    whisper?: Partial<WhisperConfig>;
    ollama?: Partial<OllamaConfig>;
  };
};

/** Resposta de toda gravação: o que ficou salvo e se é preciso reiniciar para aplicar. */
export interface SaveResult<T> {
  value: T;
  restartRequired: boolean;
}
