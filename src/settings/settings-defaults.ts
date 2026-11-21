import { DEFAULT_APPEARANCE } from '../shared/contracts/appearance';
import type { SettingsData } from '../shared/contracts/settings';

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
export const DEFAULT_WHISPER_MODEL = 'ggml-large-v3-turbo.bin';

export interface DefaultSettingsOptions {
  /** Pasta padrão da biblioteca (`<raiz>/library`). */
  libraryDir: string;
}

/** Valores iniciais: o app abre e funciona sem nenhuma configuração prévia. */
export function createDefaultSettings({ libraryDir }: DefaultSettingsOptions): SettingsData {
  return {
    paths: { libraryDir },
    appearance: structuredClone(DEFAULT_APPEARANCE),
    updates: { autoCheck: true },
    support: { starPromptHidden: false },
    local: {
      ollama: { url: DEFAULT_OLLAMA_URL },
    },
  };
}
