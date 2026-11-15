import { execFile } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { GoogleGenAI } from '@google/genai';
import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  nativeTheme,
  net,
  protocol,
  session,
  shell,
} from 'electron';

import { JobService } from '../back/modules/jobs/application/job.service';
import { ChatService } from '../back/modules/chat/chat.service';
import { BackupService } from '../backup/backup.service';
import { WindowEventPublisher } from '../ipc/event-publisher';
import { DialogFilePicker } from '../ipc/file-picker';
import { createHandlers } from '../ipc/handlers';
import { IpcRegistrar } from '../ipc/ipc-registrar';
import { createAppPaths } from '../settings/app-paths';
import { SettingsBackConfig } from '../settings/settings-back-config';

import { BackContainer } from './back-container';
import { BackServices } from './back-services';
import { createServices } from './composition';
import { applyCspHeader, buildContentSecurityPolicy, CSP_HEADER } from './content-security-policy';
import {
  APP_ORIGIN,
  APP_SCHEME,
  INDEX_FILE,
  MainEnv,
  Messages,
  windowBackground,
} from './constants';
import { electronCipher } from './electron-cipher';
import { EventBackAlerts } from './event-back-alerts';
import { NoticeStore } from './notice-store';
import { buildStartupNotices } from './startup-notices';
import { LegacyMigration, type MigrationPlan } from './legacy-migration';
import { choiceFromButton, describeMigration, MigrationPromptText } from './migration-prompt';
import { needsInitialSetup } from './first-run';
import { resolveFrontTarget, type FrontTarget } from './front-target';
import { LocalStateGuard } from './local-state-guard';
import { classifyNavigation } from './navigation-guard';
import { resolveDataRoot, resolveFrontDist, resolveResourcesDir } from './paths';
import { isSettingsShortcut } from './shortcuts';
import { SingleWindowController } from './single-window';
import { resolveStaticFile } from './static-files';
import {
  createSettingsWindowOptions,
  createSplashWindowOptions,
  createWindowOptions,
} from './window-options';

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
let splashWindow: BrowserWindow | null = null;

/** Fundo das janelas antes da primeira pintura: o do tema do sistema (a página aplica o escolhido). */
const backgroundNow = () => windowBackground(nativeTheme.shouldUseDarkColors);

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

/** Tela de abertura (colmeia carregando): aparece na hora e some quando a janela principal abre. */
function createSplashWindow(target: FrontTarget): void {
  const window = new BrowserWindow(createSplashWindowOptions(backgroundNow()));
  splashWindow = window;

  window.once('ready-to-show', () => window.show());
  window.on('closed', () => {
    splashWindow = null;
  });
  window.webContents.on('will-navigate', (event) => event.preventDefault());

  void window.loadURL(target.splashUrl);
}

function closeSplash(): void {
  splashWindow?.close();
}

function createMainWindow(target: FrontTarget): void {
  const window = new BrowserWindow(createWindowOptions(preloadPath, backgroundNow()));
  mainWindow = window;

  window.once('ready-to-show', () => {
    window.show();
    closeSplash();
  });
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
  const window = new BrowserWindow(createSettingsWindowOptions(preloadPath, backgroundNow()));

  window.once('ready-to-show', () => window.show());
  guardWindow(window, [target.origin, target.settingsOrigin]);
  void window.loadURL(target.settingsUrl);

  return window;
}

/** Pergunta, com um diálogo nativo, o que fazer com os dados da versão anterior. */
async function confirmMigration(plan: MigrationPlan) {
  const { message, detail, buttons } = describeMigration(plan);
  const result = await dialog.showMessageBox({
    type: 'question',
    title: MigrationPromptText.title,
    message,
    detail,
    buttons,
    defaultId: 0,
    cancelId: buttons.length - 1,
    noLink: true,
  });

  return choiceFromButton(result.response);
}

/** Leva os dados do formato antigo para a raiz única, antes de qualquer serviço ler as configurações. */
async function migrateLegacyData(): Promise<void> {
  const outcome = await new LegacyMigration({
    userDataDir: app.getPath('userData'),
    appPaths: createAppPaths(resolveDataRoot(app.getPath('documents'), process.env)),
    confirm: confirmMigration,
  }).run();

  if (outcome.status === 'failed') {
    dialog.showErrorBox(MigrationPromptText.failedTitle, outcome.error);
  } else if (outcome.status === 'done' && outcome.warnings.length > 0) {
    await dialog.showMessageBox({
      type: 'warning',
      title: MigrationPromptText.title,
      message: MigrationPromptText.warningTitle,
      detail: outcome.warnings.join('\n'),
    });
  }
}

async function startCore(target: FrontTarget): Promise<{ needsSetup: boolean }> {
  await migrateLegacyData();

  const localStateGuard = new LocalStateGuard({ userDataDir: app.getPath('userData') });
  const events = new WindowEventPublisher(() => BrowserWindow.getAllWindows());
  const services = createServices({
    events,
    userDataDir: app.getPath('userData'),
    rootDir: resolveDataRoot(app.getPath('documents'), process.env),
    resourcesDir: resolveResourcesDir(projectRoot, app.isPackaged, process.resourcesPath),
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
    config: new SettingsBackConfig(
      services.settings,
      services.appPaths,
      await services.secrets.get('gemini.apiKey'),
    ),
    whisper: services.whisper,
    alerts: new EventBackAlerts(events),
  });

  const notices = new NoticeStore();

  buildStartupNotices({
    jobs: container.get<JobService>(JobService).startupReport(),
    chats: container.get<ChatService>(ChatService).startupReport(),
    settingsRecoveredFromBackup: services.settings.recoveredFromBackup,
  }).forEach((notice) => notices.add(notice));

  const backServices = new BackServices(<T>(token: unknown) => container.get<T>(token));
  const backup = new BackupService({
    appVersion: app.getVersion(),
    tempDir: path.join(services.appPaths.rootDir, 'temp'),
    libraryDir: () => services.settings.get().paths.libraryDir,
    inboxDir: () => services.appPaths.inboxDir,
    collections: backServices.backupCollections(),
    settings: services.settings,
    reindexLibrary: () => backServices.reindexLibrary(),
    events,
    filePicker: new DialogFilePicker({
      showSave: (options) => {
        const parent = BrowserWindow.getFocusedWindow();

        return parent ? dialog.showSaveDialog(parent, options) : dialog.showSaveDialog(options);
      },
      showOpen: (options) => {
        const parent = BrowserWindow.getFocusedWindow();
        const config = { ...options, properties: ['openFile' as const] };

        return parent ? dialog.showOpenDialog(parent, config) : dialog.showOpenDialog(config);
      },
    }),
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
      libraryMover: services.libraryMover,
      backup,
      notices,
      settings: services.settingsService,
      externalProviders: services.externalProviders,
      localProviders: services.localProviders,
      back: backServices.readers(),
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

    createSplashWindow(target);

    const { needsSetup } = await startCore(target);

    createMainWindow(target);

    if (needsSetup) {
      settingsWindow.open();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    closeSplash();
    dialog.showErrorBox(Messages.startupErrorTitle, message);
    app.quit();
  }
}

void bootstrap();
