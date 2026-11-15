import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron';

import { createHandlers } from '../ipc/handlers';
import { IpcRegistrar } from '../ipc/ipc-registrar';
import { DesktopAppConfig } from '../settings/backend-config';
import { importLegacyEnv } from '../settings/legacy-env-import';

import { BackRuntime } from './back-runtime';
import { waitForBackend } from './backend-ready';
import { createServices } from './composition';
import {
  API_PREFIX,
  APP_ORIGIN,
  APP_SCHEME,
  BACKEND_WAIT,
  DEFAULT_API_PORT,
  HEALTH_PATH,
  INDEX_FILE,
  MainEnv,
  Messages,
} from './constants';
import { electronCipher } from './electron-cipher';
import { resolveFrontTarget, type FrontTarget } from './front-target';
import { classifyNavigation } from './navigation-guard';
import { NestHost } from './nest-host';
import { resolveBackDir, resolveFrontDist, resolveLegacyEnvFile } from './paths';
import { resolveStaticFile } from './static-files';
import { createWindowOptions } from './window-options';

const run = promisify(execFile);

// dist/main/index.js -> raiz do projeto desktop
const projectRoot = path.resolve(__dirname, '..', '..');
const preloadPath = path.join(__dirname, '..', 'preload', 'index.js');

// Permite isolar os dados (settings, segredos) em testes e desenvolvimento.
const userDataOverride = process.env[MainEnv.USER_DATA_DIR];

if (userDataOverride) {
  app.setPath('userData', userDataOverride);
}

// Precisa ser chamado antes do app ficar pronto.
protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

let mainWindow: BrowserWindow | null = null;

function registerAppProtocol(distDir: string): void {
  protocol.handle(APP_SCHEME, (request) => {
    const file = resolveStaticFile(distDir, request.url, fs.existsSync);

    if (!file) {
      return new Response('Not found', { status: 404 });
    }

    return net.fetch(pathToFileURL(file).toString());
  });
}

function apiPort(): string {
  return process.env[MainEnv.PORT] ?? DEFAULT_API_PORT;
}

function healthUrl(): string {
  return `http://127.0.0.1:${apiPort()}/${API_PREFIX}/${HEALTH_PATH}`;
}

function createMainWindow(target: FrontTarget): void {
  const window = new BrowserWindow(createWindowOptions(preloadPath));
  mainWindow = window;

  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    mainWindow = null;
  });

  const allowedOrigins = [target.origin];

  window.webContents.on('will-navigate', (event, url) => {
    const decision = classifyNavigation(url, allowedOrigins);

    if (decision === 'allow') {
      return;
    }

    event.preventDefault();

    if (decision === 'external') {
      void shell.openExternal(url);
    }
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (classifyNavigation(url, allowedOrigins) === 'external') {
      void shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  if (target.kind === 'dev') {
    window.webContents.openDevTools({ mode: 'detach' });
  }

  void window.loadURL(target.url);
}

async function startCore(target: FrontTarget): Promise<void> {
  const backDir = resolveBackDir(projectRoot, process.env);
  const runtime = new BackRuntime(backDir);

  const services = createServices({
    userDataDir: app.getPath('userData'),
    documentsDir: app.getPath('documents'),
    projectRoot,
    platform: process.platform,
    arch: process.arch,
    cipher: electronCipher,
    exists: fs.existsSync,
    fetchFn: (url, init) => fetch(url, init),
    ffmpegVersion: async () => (await run('ffmpeg', ['-version'], { timeout: 5000 })).stdout,
    checkGeminiKey: async (apiKey) => {
      const { GoogleGenAI } = runtime.pkg<{
        GoogleGenAI: new (options: { apiKey: string }) => { models: { list(): Promise<unknown> } };
      }>('@google/genai');

      await new GoogleGenAI({ apiKey }).models.list();
    },
  });

  if (!app.isPackaged) {
    importLegacyEnv({
      settings: services.settings,
      secrets: services.secrets,
      envFile: resolveLegacyEnvFile(backDir),
      exists: fs.existsSync,
      readFile: (file) => fs.readFileSync(file, 'utf8'),
    });
  }

  await new NestHost(runtime).start({
    appConfig: new DesktopAppConfig(services.settings.get(), target.origin),
    geminiApiKey: services.secrets.get('gemini.apiKey'),
    corsOrigin: target.origin,
    port: apiPort(),
  });

  if (!(await waitForBackend({ url: healthUrl(), ...BACKEND_WAIT }))) {
    throw new Error(Messages.backendNotReady);
  }

  new IpcRegistrar(ipcMain).register(
    createHandlers({
      appInfo: {
        version: () => app.getVersion(),
        // No modo dev o Vite morre junto com o app, então só fecha (rode `npm run dev` de novo).
        relaunch: () => {
          if (target.kind === 'build') {
            app.relaunch();
          }
          app.exit(0);
        },
      },
      settings: services.settingsService,
      externalProviders: services.externalProviders,
      localProviders: services.localProviders,
    }),
  );
}

async function bootstrap(): Promise<void> {
  if (!app.requestSingleInstanceLock()) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.on('window-all-closed', () => app.quit());

  await app.whenReady();

  try {
    const target = resolveFrontTarget(process.env, APP_ORIGIN);

    if (target.kind === 'build') {
      const distDir = resolveFrontDist(projectRoot, process.env);

      if (!fs.existsSync(path.join(distDir, INDEX_FILE))) {
        throw new Error(Messages.frontDistMissing);
      }

      registerAppProtocol(distDir);
    }

    await startCore(target);
    createMainWindow(target);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    dialog.showErrorBox(Messages.startupErrorTitle, message);
    app.quit();
  }
}

void bootstrap();
