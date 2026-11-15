import * as path from 'node:path';

import type { SettingsData } from '../shared/contracts/settings';

export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';
export const DEFAULT_WHISPER_MODEL = 'ggml-large-v3-turbo.bin';

export interface DefaultSettingsOptions {
  /** Pasta-raiz dos dados do HomeLab (padrão: Documentos/HomeLab). */
  rootDir: string;
  /** Pasta com o binário do Whisper (`resources/bin/<platform>-<arch>`). */
  whisperDir: string;
  platform: NodeJS.Platform;
}

/** Valores iniciais: o app abre e funciona sem nenhuma configuração prévia. */
export function createDefaultSettings({
  rootDir,
  whisperDir,
  platform,
}: DefaultSettingsOptions): SettingsData {
  return {
    paths: {
      libraryDir: path.join(rootDir, 'library'),
      inboxDir: path.join(rootDir, 'inbox'),
      videoTempDir: path.join(rootDir, 'temp', 'video'),
      audioTempDir: path.join(rootDir, 'temp', 'audio'),
    },
    local: {
      whisper: {
        directory: whisperDir,
        executable: platform === 'win32' ? 'whisper-cli.exe' : 'whisper-cli',
        model: DEFAULT_WHISPER_MODEL,
      },
      ollama: { url: DEFAULT_OLLAMA_URL },
    },
  };
}
