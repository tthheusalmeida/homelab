import type { BrowserWindowConstructorOptions } from 'electron';

import { SETTINGS_WINDOW, SPLASH_WINDOW, WINDOW, WINDOW_BACKGROUNDS } from './constants';

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
export function createWindowOptions(
  preloadPath: string,
  background: string = WINDOW_BACKGROUNDS.dark,
): BrowserWindowConstructorOptions {
  return {
    width: WINDOW.width,
    height: WINDOW.height,
    minWidth: WINDOW.minWidth,
    minHeight: WINDOW.minHeight,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: background,
    webPreferences: secureWebPreferences(preloadPath),
  };
}

/** Opções da janela de Configurações. */
export function createSettingsWindowOptions(
  preloadPath: string,
  background: string = WINDOW_BACKGROUNDS.dark,
): BrowserWindowConstructorOptions {
  return {
    width: SETTINGS_WINDOW.width,
    height: SETTINGS_WINDOW.height,
    minWidth: SETTINGS_WINDOW.minWidth,
    minHeight: SETTINGS_WINDOW.minHeight,
    title: SETTINGS_WINDOW.title,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: background,
    webPreferences: secureWebPreferences(preloadPath),
  };
}

/**
 * Tela de abertura: janelinha centralizada, sem moldura nem item na barra de tarefas, que mostra a
 * colmeia carregando até a janela principal aparecer. Não precisa do preload (não fala com o main).
 */
export function createSplashWindowOptions(
  background: string = WINDOW_BACKGROUNDS.dark,
): BrowserWindowConstructorOptions {
  return {
    width: SPLASH_WINDOW.width,
    height: SPLASH_WINDOW.height,
    title: SPLASH_WINDOW.title,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    center: true,
    show: false,
    backgroundColor: background,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}
