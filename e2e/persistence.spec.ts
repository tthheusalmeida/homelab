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

/** Um "computador" isolado: userData, raiz de dados e biblioteca numa pasta temporária (não toca nos dados reais). */
interface Sandbox {
  dir: string;
  userData: string;
  dataRoot: string;
  library: string;
}

function makeSandbox(): Sandbox {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'homelab-e2e-persist-'));
  const sandbox: Sandbox = {
    dir,
    userData: path.join(dir, 'user-data'),
    dataRoot: path.join(dir, 'data-root'),
    library: path.join(dir, 'library'),
  };
  const configDir = path.join(sandbox.dataRoot, 'config');

  fs.mkdirSync(sandbox.library, { recursive: true });
  fs.mkdirSync(configDir, { recursive: true });
  fs.mkdirSync(sandbox.userData, { recursive: true });
  // com configurações já salvas o app não abre a janela de Configurações sozinho
  fs.writeFileSync(
    path.join(configDir, 'settings.json'),
    JSON.stringify({ paths: { libraryDir: sandbox.library } }),
  );

  return sandbox;
}

function launch(sandbox: Sandbox): Promise<ElectronApplication> {
  return electron.launch({
    args: [root],
    env: {
      ...process.env,
      HOMELAB_USER_DATA_DIR: sandbox.userData,
      HOMELAB_DATA_ROOT_DIR: sandbox.dataRoot,
    },
  });
}

/** Janela principal: a primeira janela pode ser a tela de abertura (splash), que some sozinha. */
async function mainWindow(app: ElectronApplication): Promise<Page> {
  await app.firstWindow();
  const isMain = (window: Page) =>
    !window.url().includes('splash.html') &&
    !window.url().includes('/settings/') &&
    window.url() !== '';

  await expect
    .poll(() => app.windows().filter(isMain).length, { timeout: 30_000 })
    .toBeGreaterThan(0);

  return app.windows().find(isMain)!;
}

type Envelope<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };

/** Chama um canal IPC pela tela, como o app faz (o renderer só fala por `window.api`). */
async function invoke<T>(page: Page, channel: string, payload?: unknown): Promise<Envelope<T>> {
  return page.evaluate(
    ([name, body]) =>
      (
        window as unknown as {
          api: { invoke: (channel: string, payload?: unknown) => Promise<unknown> };
        }
      ).api.invoke(name as string, body),
    [channel, payload],
  ) as Promise<Envelope<T>>;
}

async function data<T>(page: Page, channel: string, payload?: unknown): Promise<T> {
  const result = await invoke<T>(page, channel, payload);

  if ((result as { ok: boolean }).ok === false) {
    const { error } = result as { error: { code: string; message: string } };

    throw new Error(`${channel}: ${error.code} ${error.message}`);
  }

  return (result as { data: T }).data;
}

/** Faz o diálogo de salvar/abrir arquivo do sistema responder com o caminho dado (sem ninguém clicar). */
async function stubDialogs(
  app: ElectronApplication,
  paths: { save?: string; open?: string },
): Promise<void> {
  await app.evaluate(({ dialog }, answers) => {
    dialog.showSaveDialog = (() =>
      Promise.resolve({ canceled: !answers.save, filePath: answers.save })) as never;
    dialog.showOpenDialog = (() =>
      Promise.resolve({
        canceled: !answers.open,
        filePaths: answers.open ? [answers.open] : [],
      })) as never;
  }, paths);
}

interface JobRow {
  id: string;
  label: string;
  status: string;
  error?: string;
}

const sandboxes: Sandbox[] = [];

function sandbox(): Sandbox {
  const made = makeSandbox();

  sandboxes.push(made);

  return made;
}

test.afterAll(() => {
  for (const made of sandboxes) {
    fs.rmSync(made.dir, { recursive: true, force: true });
  }
});

test('when a job fails and the app restarts, should keep it in the history and let the user delete it', async () => {
  test.setTimeout(120_000);
  const box = sandbox();
  let app = await launch(box);
  let page = await mainWindow(app);

  // URL que recusa a conexão: o job falha na hora, sem precisar de Whisper, ffmpeg nem rede.
  const created = await data<{ id: string }>(page, 'jobs:create-video-to-transcript', {
    url: 'http://127.0.0.1:9/video.mp4',
  });

  await expect
    .poll(
      async () =>
        (await data<JobRow[]>(page, 'jobs:list')).find((job) => job.id === created.id)?.status,
      {
        timeout: 30_000,
      },
    )
    .toBe('failed');
  await app.close();

  const jobsFile = path.join(box.dataRoot, 'data', 'jobs.json');

  expect(fs.existsSync(jobsFile)).toBe(true);
  expect(fs.readFileSync(jobsFile, 'utf8')).toContain(created.id);

  app = await launch(box);
  page = await mainWindow(app);

  try {
    const jobs = await data<JobRow[]>(page, 'jobs:list');

    expect(jobs.map((job) => job.id)).toEqual([created.id]);
    expect(jobs[0].status).toBe('failed');

    // pela tela: selecionar, excluir e confirmar
    await page.getByRole('button', { name: /^Em andamento/ }).click();
    await expect(page.getByText(created.id)).toBeVisible();
    await page.getByRole('button', { name: 'Selecionar', exact: true }).click();
    await page.getByRole('checkbox').first().check();
    await page.getByRole('button', { name: 'Excluir selecionados (1)' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click();

    await expect(page.getByText(created.id)).toHaveCount(0);
    expect(await data<JobRow[]>(page, 'jobs:list')).toEqual([]);
    expect(fs.readFileSync(jobsFile, 'utf8')).not.toContain(created.id);
  } finally {
    await app.close();
  }
});

test('when the app was closed with a job running, should open it as interrupted and say so', async () => {
  test.setTimeout(90_000);
  const box = sandbox();
  const dataDir = path.join(box.dataRoot, 'data');
  const steps = [
    { name: 'download', label: 'Baixar vídeo', status: 'running' },
    { name: 'transcribe', label: 'Transcrever', status: 'pending' },
  ];

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'jobs.json'),
    JSON.stringify({
      version: 1,
      jobs: [
        {
          id: 'job-que-estava-rodando',
          name: 'video-to-transcript',
          label: 'Transcrição de vídeo',
          status: 'running',
          createdAt: '2026-01-01T10:00:00.000Z',
          startedAt: '2026-01-01T10:00:01.000Z',
          steps,
          documentHints: {},
        },
      ],
    }),
  );

  const app = await launch(box);

  try {
    const page = await mainWindow(app);
    const jobs = await data<JobRow[]>(page, 'jobs:list');

    expect(jobs[0].status).toBe('failed');
    expect(jobs[0].error).toContain('Interrompido');
    await expect(page.getByText('1 processo foi interrompido ao fechar o app')).toBeVisible();
  } finally {
    await app.close();
  }
});

test('when chats were saved, should list them, open one with its messages and delete it', async () => {
  test.setTimeout(90_000);
  const box = sandbox();
  const dataDir = path.join(box.dataRoot, 'data');
  const chat = (id: string, title: string) => ({
    id,
    title,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    providerId: 'ollama',
    modelId: 'm',
    messageCount: 2,
    messages: [
      {
        id: `${id}-1`,
        role: 'user',
        content: `pergunta de ${id}`,
        createdAt: '2026-01-01T10:00:00.000Z',
      },
      {
        id: `${id}-2`,
        role: 'assistant',
        content: `resposta de ${id}`,
        createdAt: '2026-01-01T10:00:00.000Z',
      },
    ],
  });

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'chats.json'),
    JSON.stringify({
      version: 1,
      chats: [chat('a', 'Conversa sobre DNS'), chat('b', 'Conversa sobre Docker')],
    }),
  );

  const app = await launch(box);

  try {
    const page = await mainWindow(app);

    await page.getByRole('button', { name: 'Conversa', exact: true }).click();

    const list = page.getByRole('navigation', { name: 'Conversas' });

    await expect(list.getByText('Conversa sobre DNS')).toBeVisible();
    await expect(list.getByText('Conversa sobre Docker')).toBeVisible();

    await list.getByText('Conversa sobre DNS').click();
    await expect(page.getByText('pergunta de a')).toBeVisible();
    await expect(page.getByText('resposta de a')).toBeVisible();

    await list.getByRole('button', { name: 'Excluir a conversa Conversa sobre DNS' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir', exact: true }).click();

    await expect(list.getByText('Conversa sobre DNS')).toHaveCount(0);
    await expect(list.getByText('Conversa sobre Docker')).toBeVisible();
    expect(fs.readFileSync(path.join(dataDir, 'chats.json'), 'utf8')).not.toContain(
      'Conversa sobre DNS',
    );
  } finally {
    await app.close();
  }
});

test('when a backup is created and restored in a clean computer, should bring the pages and never include secrets or temp files', async () => {
  test.setTimeout(150_000);
  const source = sandbox();
  const target = sandbox();
  const zip = path.join(source.dir, 'backup.zip');
  const first = await launch(source);

  try {
    const page = await mainWindow(first);

    await data(page, 'library:documents:create-article', {
      title: 'Página do backup',
      category: ['Testes'],
      tags: ['e2e'],
      content: '# Olá\n\nconteúdo que deve voltar.',
    });
    // um segredo e um temporário que não podem entrar no zip
    await data(page, 'providers:external:save', { id: 'gemini', apiKey: 'chave-falsa-e2e-12345' });
    fs.mkdirSync(path.join(source.dataRoot, 'temp', 'video'), { recursive: true });
    fs.writeFileSync(path.join(source.dataRoot, 'temp', 'video', 'aula.mp4'), 'video grande');

    const preview = await data<{
      items: Array<{ id: string; count: number }>;
      notIncluded: string[];
    }>(page, 'backup:preview');

    expect(preview.items.find((item) => item.id === 'library')?.count).toBe(1);
    expect(preview.notIncluded).toEqual(
      expect.arrayContaining(['secrets', 'temp', 'ai-binaries', 'preferences', 'library-path']),
    );

    await stubDialogs(first, { save: zip });

    const created = await data<{ cancelled: boolean; path: string; bytes: number }>(
      page,
      'backup:create',
      {
        items: ['library', 'inbox', 'jobs', 'chats', 'usage', 'settings'],
      },
    );

    expect(created).toMatchObject({ cancelled: false, path: zip });
    expect(created.bytes).toBeGreaterThan(0);
  } finally {
    await first.close();
  }

  const bytes = fs.readFileSync(zip);

  expect(bytes.subarray(0, 2).toString()).toBe('PK');
  expect(bytes.includes('library/')).toBe(true);
  expect(bytes.includes('manifest.json')).toBe(true);
  expect(bytes.includes('secrets.json')).toBe(false);
  expect(bytes.includes('aula.mp4')).toBe(false);
  expect(bytes.includes('chave-falsa-e2e-12345')).toBe(false);

  const second = await launch(target);

  try {
    const page = await mainWindow(second);

    await stubDialogs(second, { open: zip });

    const inspection = await data<{ token: string; items: Array<{ id: string; count: number }> }>(
      page,
      'backup:inspect',
    );

    expect(inspection.items.find((item) => item.id === 'library')?.count).toBe(1);

    const restored = await data<{ items: Array<{ id: string; added: number }> }>(
      page,
      'backup:restore',
      {
        token: inspection.token,
        items: ['library'],
        mode: 'merge',
      },
    );

    expect(restored.items).toEqual([{ id: 'library', added: 1, skipped: 0 }]);

    const documents = await data<Array<{ title: string }>>(page, 'library:documents:list', {});

    expect(documents.map((document) => document.title)).toEqual(['Página do backup']);
    expect(
      fs
        .readdirSync(path.join(target.dataRoot, 'temp'))
        .filter((name) => name.startsWith('restore-')),
    ).toEqual([]);
  } finally {
    await second.close();
  }
});

test('when the settings window opens, should offer the library and backup sections without the old folder fields', async () => {
  test.setTimeout(90_000);
  const app = await launch(sandbox());

  try {
    const page = await mainWindow(app);

    await invoke(page, 'app:open-settings');
    await expect
      .poll(() => app.windows().some((window) => window.url().includes('/settings/')), {
        timeout: 20_000,
      })
      .toBe(true);

    const settings = app.windows().find((window) => window.url().includes('/settings/'))!;

    await expect(settings.getByRole('button', { name: /^Biblioteca/ })).toBeVisible();
    await expect(settings.getByRole('button', { name: /^Backup/ })).toBeVisible();
    await expect(settings.getByLabel('Biblioteca')).toBeVisible();
    await expect(settings.getByLabel('Entrada')).toHaveCount(0);
    await expect(settings.getByLabel('Vídeos temporários')).toHaveCount(0);

    await settings.getByRole('button', { name: /^Backup/ }).click();
    await expect(settings.getByText('O que NÃO entra no backup')).toBeVisible();
    await expect(settings.getByText('Chaves de API', { exact: false })).toBeVisible();
  } finally {
    await app.close();
  }
});

test('when the sidebar sections are collapsed and the app restarts, should remember which ones were closed', async () => {
  test.setTimeout(90_000);
  const box = sandbox();
  let app = await launch(box);
  let page = await mainWindow(app);

  await expect(page.getByRole('button', { name: 'Conversa', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^IA/ }).click();
  await expect(page.getByRole('button', { name: 'Conversa', exact: true })).toHaveCount(0);
  await app.close();

  app = await launch(box);
  page = await mainWindow(app);

  try {
    await expect(page.getByRole('button', { name: /^IA/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    await expect(page.getByRole('button', { name: 'Conversa', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Páginas', exact: true })).toBeVisible();
  } finally {
    await app.close();
  }
});
