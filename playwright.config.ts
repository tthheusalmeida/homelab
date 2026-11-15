import { defineConfig } from '@playwright/test';

// Smoke E2E do app Electron real. Rode `npm run build` antes (o script `test:e2e` já faz isso).
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
});
