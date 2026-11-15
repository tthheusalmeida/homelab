import * as path from 'node:path';

import { IpcError, IpcErrorCode } from '../shared/errors';
import { ACCENT_IDS, THEME_MODES } from '../shared/contracts/appearance';
import type { SettingsData } from '../shared/contracts/settings';

export const SettingsMessages = {
  pathRequired: (label: string) => `Informe ${label}.`,
  pathNotAbsolute: (label: string) => `${label} deve ser um caminho completo (absoluto).`,
  urlInvalid: 'A URL do Ollama deve ser um endereço http ou https válido.',
  themeInvalid: 'Escolha um tema válido: sistema, claro ou escuro.',
  accentInvalid: 'Escolha uma das cores de destaque disponíveis.',
} as const;

const LIBRARY_LABEL = 'a pasta da biblioteca';

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

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Valida as configurações completas. Lança `IpcError(VALIDATION)` com mensagem em português. */
export function validateSettings(settings: SettingsData): void {
  requireAbsolutePath(settings.paths.libraryDir, LIBRARY_LABEL);

  if (!THEME_MODES.includes(settings.appearance.theme)) {
    fail(SettingsMessages.themeInvalid);
  }

  if (!ACCENT_IDS.includes(settings.appearance.accent)) {
    fail(SettingsMessages.accentInvalid);
  }

  const { ollama } = settings.local;

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
