import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { GoogleGenAI } from '@google/genai';
import { app, BrowserWindow, dialog, ipcMain, net, protocol, session, shell } from 'electron';

import { createHandlers } from '../ipc/handlers';
import { IpcRegistrar } from '../ipc/ipc-registrar';
import { SettingsBackConfig } from '../settings/settings-back-config';

import { BackContainer } from './back-container';
import { BackServices } from './back-services';
import { createServices } from './composition';
import { applyCspHeader, buildContentSecurityPolicy, CSP_HEADER } from './content-security-policy';
import { APP_ORIGIN, APP_SCHEME, INDEX_FILE, MainEnv, Messages } from './constants';
import { electronCipher } from './electron-cipher';
import { needsInitialSetup } from './first-run';
import { resolveFrontTarget, type FrontTarget } from './front-target';
import { LocalStateGuard } from './local-state-guard';
import { classifyNavigation } from './navigation-guard';
import { resolveFrontDist } from './paths';
import { isSettingsShortcut } from './shortcuts';
import { SingleWindowController } from './single-window';
import { resolveStaticFile } from './static-files';
import { createSettingsWindowOptions, createWindowOptions } from './window-options';

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
let settingsWindow: SingleWindowController<BrowserWindow> | null = null;

/** Serve o build do renderer em `app://front`, com a política de segurança de conteúdo. */
function registerAppProtocol(distDir: string, policy: string): void {
  protocol.handle(APP_SCHEME, async (request) => {
    const file = resolveStaticFile(distDir, request.url, fs.existsSync);

    if (!file) {
      return new Response('Not found', { status: 404 });
    }

    const response = await net.fetch(pathToFileURL(file).toString());
    const headers = new Headers(response.headers);
    headers.set(CSP_HEADER, policy);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });
}

/** No dev as páginas vêm dos servidores do Vite: a política entra pelos cabeçalhos da resposta. */
function applyDevPolicy(target: FrontTarget, policy: string): void {
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: [`${target.origin}/*`, `${target.settingsOrigin}/*`] },
    (details, callback) => {
      callback({ responseHeaders: applyCspHeader(details.responseHeaders ?? {}, policy) });
    },
  );
}

/** Navegação só dentro das origens do app; links externos abrem no navegador do sistema. */
function guardWindow(window: BrowserWindow, allowedOrigins: string[]): void {
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

  window.webContents.on('before-input-event', (event, input) => {
    if (isSettingsShortcut(input)) {
      event.preventDefault();
      settingsWindow?.open();
    }
  });
}

function createMainWindow(target: FrontTarget): void {
  const window = new BrowserWindow(createWindowOptions(preloadPath));
  mainWindow = window;

  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    mainWindow = null;
  });

  guardWindow(window, [target.origin, target.settingsOrigin]);

  if (target.kind === 'dev') {
    window.webContents.openDevTools({ mode: 'detach' });
  }

  void window.loadURL(target.url);
}

function createSettingsWindow(target: FrontTarget): BrowserWindow {
  const window = new BrowserWindow(createSettingsWindowOptions(preloadPath));

  window.once('ready-to-show', () => window.show());
  guardWindow(window, [target.origin, target.settingsOrigin]);
  void window.loadURL(target.settingsUrl);

  return window;
}

async function startCore(target: FrontTarget): Promise<{ needsSetup: boolean }> {
  const localStateGuard = new LocalStateGuard({ userDataDir: app.getPath('userData') });
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
    whisperIo: {
      run: (file, args) => run(file, args),
      readText: (file) => fs.promises.readFile(file, 'utf8'),
      remove: (file) => fs.promises.unlink(file),
    },
    checkGeminiKey: async (apiKey) => {
      await new GoogleGenAI({ apiKey }).models.list();
    },
  });

  const firstRun = services.settings.isFirstRun();

  // O back roda dentro do main, como contêiner de injeção de dependência: sem HTTP e sem porta.
  const container = await BackContainer.start({
    config: new SettingsBackConfig(services.settings, await services.secrets.get('gemini.apiKey')),
    whisper: services.whisper,
  });

  new IpcRegistrar(ipcMain).register(
    createHandlers({
      appInfo: {
        version: () => app.getVersion(),
        // No modo dev o Vite morre junto com o app, então só fecha (rode `npm run dev` de novo).
        relaunch: async () => {
          // Sem a chave no `Local State`, o segredo recém-salvo ficaria ilegível ao reabrir.
          await localStateGuard.waitUntilPersisted();

          if (target.kind === 'build') {
            app.relaunch();
          }
          app.exit(0);
        },
        openSettings: () => {
          settingsWindow?.open();
        },
      },
      folderPicker: {
        pick: async (defaultPath) => {
          const options = {
            properties: ['openDirectory', 'createDirectory'] as Array<
              'openDirectory' | 'createDirectory'
            >,
            defaultPath,
          };
          const parent = BrowserWindow.getFocusedWindow();
          const result = parent
            ? await dialog.showOpenDialog(parent, options)
            : await dialog.showOpenDialog(options);

          return result.canceled ? null : (result.filePaths[0] ?? null);
        },
      },
      settings: services.settingsService,
      externalProviders: services.externalProviders,
      localProviders: services.localProviders,
      back: new BackServices(<T>(token: unknown) => container.get<T>(token)).readers(),
    }),
  );

  // Primeira execução sem chave do Gemini: leva o usuário direto às Configurações.
  return { needsSetup: needsInitialSetup(firstRun, services.secrets.has('gemini.apiKey')) };
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

    settingsWindow = new SingleWindowController(() => createSettingsWindow(target));

    const policy = buildContentSecurityPolicy({
      mode: target.kind,
      devOrigins: target.kind === 'dev' ? [target.origin, target.settingsOrigin] : [],
    });

    if (target.kind === 'build') {
      const distDir = resolveFrontDist(projectRoot, process.env);

      if (!fs.existsSync(path.join(distDir, INDEX_FILE))) {
        throw new Error(Messages.frontDistMissing);
      }

      registerAppProtocol(distDir, policy);
    } else {
      applyDevPolicy(target, policy);
    }

    const { needsSetup } = await startCore(target);

    createMainWindow(target);

    if (needsSetup) {
      settingsWindow.open();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    dialog.showErrorBox(Messages.startupErrorTitle, message);
    app.quit();
  }
}

void bootstrap();
