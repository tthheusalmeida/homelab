import * as path from 'node:path';

import { IpcError, IpcErrorCode } from '../shared/errors';
import type { SettingsData } from '../shared/contracts/settings';

export const SettingsMessages = {
  pathRequired: (label: string) => `Informe ${label}.`,
  pathNotAbsolute: (label: string) => `${label} deve ser um caminho completo (absoluto).`,
  urlInvalid: 'A URL do Ollama deve ser um endereço http ou https válido.',
  fileNameRequired: (label: string) => `Informe ${label}.`,
  fileNameHasPath: (label: string) => `${label} deve ser só o nome do arquivo, sem pastas.`,
} as const;

const PATH_LABELS = {
  libraryDir: 'a pasta da biblioteca',
  inboxDir: 'a pasta de entrada',
  videoTempDir: 'a pasta temporária de vídeos',
  audioTempDir: 'a pasta temporária de áudios',
} as const;

function fail(message: string): never {
  throw new IpcError(IpcErrorCode.VALIDATION, message);
}

function requireAbsolutePath(value: string, label: string): void {
  if (!value.trim()) {
    fail(SettingsMessages.pathRequired(label));
  }

  if (!path.isAbsolute(value)) {
    fail(SettingsMessages.pathNotAbsolute(capitalize(label)));
  }
}

function requireFileName(value: string, label: string): void {
  if (!value.trim()) {
    fail(SettingsMessages.fileNameRequired(label));
  }

  if (path.basename(value) !== value || value.includes('/') || value.includes('\\')) {
    fail(SettingsMessages.fileNameHasPath(capitalize(label)));
  }
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Valida as configurações completas. Lança `IpcError(VALIDATION)` com mensagem em português. */
export function validateSettings(settings: SettingsData): void {
  for (const [key, label] of Object.entries(PATH_LABELS)) {
    requireAbsolutePath(settings.paths[key as keyof typeof PATH_LABELS], label);
  }

  const { whisper, ollama } = settings.local;

  requireAbsolutePath(whisper.directory, 'a pasta do Whisper');
  requireFileName(whisper.executable, 'o executável do Whisper');
  requireFileName(whisper.model, 'o arquivo de modelo do Whisper');

  try {
    const url = new URL(ollama.url);

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      fail(SettingsMessages.urlInvalid);
    }
  } catch (error) {
    if (error instanceof IpcError) {
      throw error;
    }

    fail(SettingsMessages.urlInvalid);
  }
}
