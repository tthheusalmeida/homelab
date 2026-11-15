import { execFileSync, spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  _electron as electron,
  expect,
  test,
  type ElectronApplication,
  type Page,
} from '@playwright/test';

const root = path.resolve(__dirname, '..');

/** Tudo (pasta de dados, biblioteca, jobs) vive numa pasta temporária: não toca nos dados reais. */
function makeUserData(withSettings: boolean): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'homelab-e2e-'));

  if (withSettings) {
    const paths = {
      libraryDir: path.join(dir, 'library'),
      jobsDir: path.join(dir, 'jobs'),
    };

    fs.mkdirSync(paths.libraryDir);
    fs.mkdirSync(paths.jobsDir);
    fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ paths }));
  }

  return dir;
}

/** Janela principal: a primeira janela pode ser a tela de abertura (splash), que some sozinha. */
async function mainWindow(app: ElectronApplication): Promise<Page> {
  await app.firstWindow();
  const isMain = (window: Page) => !window.url().includes('splash.html') && window.url() !== '';

  await expect.poll(() => app.windows().filter(isMain).length, { timeout: 20_000 }).toBeGreaterThan(0);

  return app.windows().find(isMain)!;
}

function launch(userData: string): Promise<ElectronApplication> {
  return electron.launch({
    args: [root],
    env: { ...process.env, HOMELAB_USER_DATA_DIR: userData },
  });
}

/** Portas TCP em escuta do processo principal e dos filhos (só Windows). */
function listeningPorts(pid: number): number[] {
  const script = `
    $ids = @(${pid})
    do {
      $more = Get-CimInstance Win32_Process | Where-Object { $ids -contains $_.ParentProcessId -and $ids -notcontains $_.ProcessId } | ForEach-Object { $_.ProcessId }
      $ids += $more
    } while ($more)
    Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ids -contains $_.OwningProcess } | ForEach-Object { $_.LocalPort }
  `;
  const out = execFileSync('powershell', ['-NoProfile', '-Command', script], { encoding: 'utf8' });

  return out.split(/\s+/).filter(Boolean).map(Number);
}

test.describe('app com configuração existente', () => {
  let app: ElectronApplication;
  const httpRequests: string[] = [];

  test.beforeAll(async () => {
    app = await launch(makeUserData(true));
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('when the app opens, should show the home with the sidebar and check the services', async () => {
    const page = await mainWindow(app);
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) httpRequests.push(request.url());
    });
    await page.reload();

    await expect(page.getByText('Central de controle do HomeLab.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conversa', exact: true })).toBeVisible();
    await expect(page.getByText('Serviços do sistema')).toBeVisible();
  });

  test('when navigating through the main screens, should render each one', async () => {
    const page = await mainWindow(app);
    const screens: [string, string | RegExp][] = [
      ['Páginas', 'Seus conhecimentos organizados por tema.'],
      ['Livros', /Livros/],
      ['Conversa', 'Como posso te ajudar hoje?'],
      ['Consumo', 'Consumo de IA'],
      ['Nova tarefa', 'Selecione o tipo de tarefa'],
      ['Acompanhar', 'Tarefas'],
    ];

    for (const [link, expected] of screens) {
      await page.getByRole('button', { name: link, exact: true }).click();
      await expect(page.getByText(expected).first()).toBeVisible();
    }
  });

  test('when creating an article, should save it and open it in the library', async () => {
    const page = await mainWindow(app);

    await page.getByRole('button', { name: 'Nova página', exact: true }).click();
    await page.getByLabel('Título').fill('Ligações Peptídicas');
    await page.getByLabel('Categoria').fill('Química');
    await page.getByLabel('Subcategoria').fill('Ligações');
    await page.getByLabel('Adicionar tag').fill('bioquímica');
    await page.getByLabel('Adicionar tag').press('Enter');
    await page.getByLabel('Conteúdo').fill('# Olá\n\nTexto do artigo.');
    await page.getByRole('button', { name: /Salvar página/ }).click();

    await expect(page.getByRole('heading', { name: 'Ligações Peptídicas' }).first()).toBeVisible();
    await expect(page).toHaveURL(/#?\/library\/.+/);
  });

  test('when the app ran, should not have made any http request', () => {
    expect(httpRequests).toEqual([]);
  });
});

test('when a new user opens the app, should open the settings window without a gemini key', async () => {
  const app = await launch(makeUserData(false));

  try {
    // A janelinha de abertura (splash) some sozinha; ficam a principal e as Configurações.
    const urls = () => app.windows().map((window) => window.url());

    await expect
      .poll(() => urls().filter((url) => !url.includes('splash.html')).length, { timeout: 20_000 })
      .toBe(2);
    await expect.poll(() => app.windows().length, { timeout: 20_000 }).toBe(2);

    expect(urls().some((url) => url.includes('/settings/'))).toBe(true);
    expect(urls().some((url) => !url.includes('/settings/'))).toBe(true);
  } finally {
    await app.close();
  }
});

test('when the app runs on its own, should not listen on any tcp port', async () => {
  test.skip(process.platform !== 'win32', 'verificação de portas só no Windows');

  // Sem o Playwright: ele próprio abre uma porta de depuração no Electron que controla.
  const electronBinary = require('electron') as unknown as string;
  const child = spawn(electronBinary, [root], {
    env: { ...process.env, HOMELAB_USER_DATA_DIR: makeUserData(true) },
    stdio: 'ignore',
  });

  try {
    await new Promise((resolve) => setTimeout(resolve, 10_000));

    expect(listeningPorts(child.pid as number)).toEqual([]);
  } finally {
    execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F']);
  }
});

/**
 * Encerra o Electron que o `app.relaunch()` abre. A pasta de dados vai por variável de ambiente
 * (não aparece na linha de comando), então filtra pelo executável deste projeto. Roda sem outro
 * Electron do projeto aberto (o Playwright já fechou o primeiro).
 */
function killRelaunchedInstances(): void {
  const exe = path.join(root, 'node_modules', 'electron', 'dist', 'electron.exe').replace(/'/g, "''");
  const script = `Get-CimInstance Win32_Process -Filter "Name='electron.exe'" | Where-Object { $_.ExecutablePath -eq '${exe}' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;

  execFileSync('powershell', ['-NoProfile', '-Command', script]);
}

test('when saving the gemini key and restarting right away, should keep the key readable', async () => {
  test.skip(process.platform !== 'win32', 'limpeza de processos só no Windows');
  test.setTimeout(90_000);
  const userData = makeUserData(true);
  const first = await launch(userData);
  const page = await mainWindow(first);

  const saved = await page.evaluate(() =>
    window.api.invoke('providers:external:save', { id: 'gemini', apiKey: 'chave-falsa-e2e-123' }),
  );
  expect(saved).toMatchObject({ ok: true });

  const closed = first.waitForEvent('close');
  void page.evaluate(() => window.api.invoke('app:relaunch')).catch(() => undefined);
  await closed;
  killRelaunchedInstances();
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const localState = fs.readFileSync(path.join(userData, 'Local State'), 'utf8');
  expect(localState).toContain('"encrypted_key"');

  const second = await launch(userData);

  try {
    const result = (await (await mainWindow(second)).evaluate(() =>
      window.api.invoke('providers:external:list'),
    )) as { ok: true; data: Array<{ id: string; configured: boolean }> };

    expect(result.data.find((provider) => provider.id === 'gemini')?.configured).toBe(true);
  } finally {
    await second.close();
  }
});
