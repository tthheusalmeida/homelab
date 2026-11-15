// Build da janela de Configurações (só existe no desktop). Reaproveita a UI e o tema do front.
// Roda com o Vite do front:  node ../front/node_modules/vite/bin/vite.js --config vite.renderer.settings.config.mts
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createFrontBridge } from './renderer/vite/front-bridge.mts';

const desktopRoot = fileURLToPath(new URL('.', import.meta.url));
const bridge = createFrontBridge(desktopRoot);

export const SETTINGS_DEV_PORT = 5174;

export default {
  root: path.join(bridge.rendererDir, 'settings'),
  // Caminhos relativos: a janela abre em app://front/settings/index.html
  base: './',
  publicDir: false,
  resolve: { alias: [...bridge.aliases, ...bridge.reactAliases] },
  plugins: [
    bridge.resolveFromFront({ noImporter: true }),
    bridge.loadPlugin<() => unknown>('@vitejs/plugin-react')(),
    bridge.loadPlugin<() => unknown>('@tailwindcss/vite')(),
  ],
  server: {
    port: SETTINGS_DEV_PORT,
    strictPort: true,
    fs: { allow: [bridge.frontDir, bridge.desktopRoot] },
  },
  build: {
    outDir: bridge.posix(`${bridge.desktopRoot}dist-renderer/settings`),
    emptyOutDir: true,
  },
};
