import type { BrowserWindowConstructorOptions } from 'electron';

import { WINDOW } from './constants';

/** Opções da janela principal. As flags de segurança são obrigatórias (ver docs/arquitetura.md). */
export function createWindowOptions(preloadPath: string): BrowserWindowConstructorOptions {
  return {
    width: WINDOW.width,
    height: WINDOW.height,
    minWidth: WINDOW.minWidth,
    minHeight: WINDOW.minHeight,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}
