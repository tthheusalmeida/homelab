import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

import { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } from 'electron';

import { createHandlers } from '../ipc/handlers';
import { IpcRegistrar } from '../ipc/ipc-registrar';

import { waitForBackend } from './backend-ready';
import { BackendLauncher } from './backend-launcher';
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
import { resolveFrontTarget, type FrontTarget } from './front-target';
import { classifyNavigation } from './navigation-guard';
import { resolveBackDir, resolveFrontDist } from './paths';
import { resolveStaticFile } from './static-files';
import { createWindowOptions } from './window-options';

// dist/main/index.js -> raiz do projeto desktop
const projectRoot = path.resolve(__dirname, '..', '..');
const preloadPath = path.join(__dirname, '..', 'preload', 'index.js');

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

const loadModule = createRequire(__filename);

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

function healthUrl(): string {
  const port = process.env[MainEnv.PORT] ?? DEFAULT_API_PORT;

  return `http://127.0.0.1:${port}/${API_PREFIX}/${HEALTH_PATH}`;
}

async function startBackend(corsOrigin: string): Promise<void> {
  new BackendLauncher({
    env: process.env,
    chdir: (dir) => process.chdir(dir),
    load: (entry) => loadModule(entry) as unknown,
  }).start(resolveBackDir(projectRoot, process.env), corsOrigin);

  const ready = await waitForBackend({ url: healthUrl(), ...BACKEND_WAIT });

  if (!ready) {
    throw new Error(Messages.backendNotReady);
  }
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

    await startBackend(target.origin);
    new IpcRegistrar(ipcMain).register(
      createHandlers({ appInfo: { version: () => app.getVersion() } }),
    );
    createMainWindow(target);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    dialog.showErrorBox(Messages.startupErrorTitle, message);
    app.quit();
  }
}

void bootstrap();
