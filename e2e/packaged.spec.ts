import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { _electron as electron, expect, test } from '@playwright/test';

// Roda o app EMPACOTADO (`npm run dist:dir` gera release/win-unpacked). Sem ele, o teste é pulado.
const exe = path.resolve(__dirname, '..', 'release', 'win-unpacked', 'HomeLab.exe');

test('when running the packaged app, should open the home and find the bundled whisper', async () => {
  test.skip(!fs.existsSync(exe), 'rode `npm run dist:dir` antes');
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'homelab-e2e-pkg-'));
  const app = await electron.launch({
    executablePath: exe,
    env: {
      ...process.env,
      HOMELAB_USER_DATA_DIR: userData,
      // Os testes não consultam o GitHub atrás de versão nova.
      HOMELAB_UPDATES: 'off',
      HOMELAB_DATA_ROOT_DIR: path.join(userData, 'data-root'),
    },
  });

  try {
    // Usuário novo: abre a Home e a janela de Configurações.
    await expect.poll(() => app.windows().length, { timeout: 30_000 }).toBe(2);
    const home = app.windows().find((window) => window.url().startsWith('app://front/index'));
    const main = home ?? app.windows().find((window) => !window.url().includes('splash.html')) ?? app.windows()[0];
    const locals = (await main.evaluate(() => window.api.invoke('providers:local:list'))) as {
      ok: true;
      data: Array<{ id: string; editable: boolean }>;
    };
    const whisper = locals.data.find((provider) => provider.id === 'whisper');
    const resources = path.join(path.dirname(exe), 'resources', 'bin', 'win32-x64');

    // O Whisper usa os padrões do app (fixos, só dá para testar): o binário vem no instalador.
    expect(whisper?.editable).toBe(false);
    expect(fs.existsSync(path.join(resources, 'whisper-cli.exe'))).toBe(true);
  } finally {
    await app.close();
  }
});
