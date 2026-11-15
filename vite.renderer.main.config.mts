// Build do app principal (renderer/src). Dev: `vite --config vite.renderer.main.config.mts`
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { rendererAliases } from './renderer/vite-aliases.mts';

const desktopRoot = fileURLToPath(new URL('.', import.meta.url));

export const MAIN_DEV_PORT = 5173;

export default {
  root: path.join(desktopRoot, 'renderer'),
  // Cache de dependências próprio: os dois servidores de dev (app e Configurações) não podem
  // dividir `node_modules/.vite`, senão um invalida o cache do outro (504 Outdated Optimize Dep).
  cacheDir: path.join(desktopRoot, 'node_modules', '.vite-main'),
  resolve: { alias: rendererAliases(desktopRoot) },
  plugins: [react(), tailwindcss()],
  server: { port: MAIN_DEV_PORT, strictPort: true, fs: { allow: [desktopRoot] } },
  build: { outDir: path.join(desktopRoot, 'dist-renderer'), emptyOutDir: true },
};
