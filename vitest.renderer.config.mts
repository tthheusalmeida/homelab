// Testes do renderer. Roda com: vitest run --config vitest.renderer.config.mts
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';

import { rendererAliases } from './renderer/vite-aliases.mts';

const desktopRoot = fileURLToPath(new URL('.', import.meta.url));

export default {
  root: desktopRoot,
  resolve: { alias: rendererAliases(desktopRoot) },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['renderer/**/*.test.{ts,tsx}'],
    setupFiles: [path.join(desktopRoot, 'renderer', 'src', 'test', 'setup.ts')],
    css: false,
    restoreMocks: true,
  },
};
