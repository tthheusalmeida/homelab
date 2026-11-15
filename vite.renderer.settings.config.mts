// Build da janela de Configurações. Dev: `vite --config vite.renderer.settings.config.mts`
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { rendererAliases } from './renderer/vite-aliases.mts';

const desktopRoot = fileURLToPath(new URL('.', import.meta.url));

export const SETTINGS_DEV_PORT = 5174;

export default {
  root: path.join(desktopRoot, 'renderer', 'settings'),
  // Cache de dependências próprio (ver `vite.renderer.main.config.mts`).
  cacheDir: path.join(desktopRoot, 'node_modules', '.vite-settings'),
  // Caminhos relativos: a janela abre em app://front/settings/index.html
  base: './',
  // Mesma pasta public do app: leva o theme-init.js (tema antes do primeiro quadro).
  publicDir: path.join(desktopRoot, 'renderer', 'public'),
  resolve: { alias: rendererAliases(desktopRoot) },
  plugins: [react(), tailwindcss()],
  server: { port: SETTINGS_DEV_PORT, strictPort: true, fs: { allow: [desktopRoot] } },
  build: { outDir: path.join(desktopRoot, 'dist-renderer', 'settings'), emptyOutDir: true },
};
