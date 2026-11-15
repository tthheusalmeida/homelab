// Testes dos componentes do renderer do desktop, com o Vitest do front.
// Roda com:  node ../front/node_modules/vitest/vitest.mjs run --config vitest.renderer.config.mts
import { fileURLToPath } from 'node:url';

import { createFrontBridge } from './renderer/vite/front-bridge.mts';

const desktopRoot = fileURLToPath(new URL('.', import.meta.url));
const bridge = createFrontBridge(desktopRoot);

export default {
  root: desktopRoot,
  resolve: { alias: bridge.aliases },
  plugins: [bridge.resolveFromFront(), bridge.loadPlugin<() => unknown>('@vitejs/plugin-react')()],
  server: { fs: { allow: [bridge.frontDir, bridge.desktopRoot] } },
  test: {
    environment: 'jsdom',
    include: ['renderer/**/*.test.{ts,tsx}'],
    setupFiles: [`${bridge.posix(bridge.frontSrc)}/test/setup.ts`],
    css: false,
    restoreMocks: true,
  },
};
