import type { BrowserWindowConstructorOptions } from 'electron';

import { SETTINGS_WINDOW, WINDOW, WINDOW_BACKGROUND } from './constants';

/** Flags de segurança obrigatórias em toda janela (ver docs/arquitetura.md). */
function secureWebPreferences(preloadPath: string) {
  return {
    preload: preloadPath,
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
  };
}

/** Opções da janela principal. */
export function createWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: WINDOW.width,
    height: WINDOW.height,
    minWidth: WINDOW.minWidth,
    minHeight: WINDOW.minHeight,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: WINDOW_BACKGROUND,
    webPreferences: secureWebPreferences(preloadPath),
  };
}

/** Opções da janela de Configurações. */
export function createSettingsWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: SETTINGS_WINDOW.width,
    height: SETTINGS_WINDOW.height,
    minWidth: SETTINGS_WINDOW.minWidth,
    minHeight: SETTINGS_WINDOW.minHeight,
    title: SETTINGS_WINDOW.title,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: WINDOW_BACKGROUND,
    webPreferences: secureWebPreferences(preloadPath),
  };
}
