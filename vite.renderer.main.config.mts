// Build do app principal (o front atual) com módulos trocados pelo desktop.
// Roda com o Vite do front:  node ../front/node_modules/vite/bin/vite.js --config vite.renderer.main.config.mts
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createFrontBridge } from './renderer/vite/front-bridge.mts';

const desktopRoot = fileURLToPath(new URL('.', import.meta.url));
const bridge = createFrontBridge(desktopRoot);

// Fonte única dos módulos trocados: renderer/overrides/overrides.lock.json
const lock = JSON.parse(
  fs.readFileSync(path.join(desktopRoot, 'renderer', 'overrides', 'overrides.lock.json'), 'utf8'),
) as Record<string, { override: string }>;

const overrides = Object.fromEntries(
  Object.entries(lock).map(([front, entry]) => [front, entry.override]),
);

export const MAIN_DEV_PORT = 5173;

export default {
  root: bridge.frontDir,
  resolve: { alias: bridge.aliases },
  plugins: [
    // Módulos do front trocados pelas versões do desktop.
    bridge.overrides(overrides),
    bridge.resolveFromFront(),
    bridge.loadPlugin<() => unknown>('@vitejs/plugin-react')(),
    bridge.loadPlugin<() => unknown>('@tailwindcss/vite')(),
  ],
  server: {
    port: MAIN_DEV_PORT,
    strictPort: true,
    // O arquivo trocado vive fora da raiz (a pasta do front).
    fs: { allow: [bridge.frontDir, bridge.desktopRoot] },
  },
  build: {
    outDir: bridge.posix(`${bridge.desktopRoot}dist-renderer`),
    emptyOutDir: true,
  },
};
