import { JobAccess, type PlatformLogin } from '../../jobs/job-access';
import type { ExternalProvidersService } from '../../providers/external-providers.service';
import type { LocalProvidersService } from '../../providers/local-providers.service';
import type { SettingsService } from '../../settings/settings.service';
import type { IpcHandler } from '../ipc-handler';

import { AiHandler, type AiCatalog, type AiUsageSource } from './ai.handler';
import { AppHandler, type AppInfo } from './app.handler';
import { BackupHandler, type BackupPort } from './backup.handler';
import { ComponentsHandler, type ComponentsPort } from './components.handler';
import { NoticeHandler, type PendingNotices } from './notice.handler';
import { BookHandler, type BookReader, type BookWriter } from './book.handler';
import { ChatHandler, type ChatSource } from './chat.handler';
import { ExternalProvidersHandler } from './external-providers.handler';
import { HealthHandler, type HealthCheckSource } from './health.handler';
import {
  JobHandler,
  type JobCancellerPort,
  type JobCatalogPort,
  type JobDeleterPort,
  type JobLauncherPort,
} from './job.handler';
import {
  LibraryHandler,
  type LibraryClassifierPort,
  type LibraryReader,
  type LibraryWriter,
} from './library.handler';
import { LocalProvidersHandler } from './local-providers.handler';
import { SettingsHandler, type FolderPicker, type LibraryFolderPort } from './settings.handler';

/** Services do back (Nest) usados pelos handlers de leitura. */
export interface BackReaders {
  healthSystem: HealthCheckSource;
  healthAi: HealthCheckSource;
  ai: AiCatalog;
  aiUsage: AiUsageSource;
  chat: ChatSource;
  library: LibraryReader & LibraryWriter;
  libraryClassifier: LibraryClassifierPort;
  books: BookReader & BookWriter;
  jobs: {
    catalog: JobCatalogPort;
    launcher: JobLauncherPort;
    deleter: JobDeleterPort;
    canceller: JobCancellerPort;
  };
}

export interface HandlerDeps {
  appInfo: AppInfo;
  folderPicker: FolderPicker;
  libraryMover: LibraryFolderPort;
  backup: BackupPort;
  notices: PendingNotices;
  components: ComponentsPort;
  /** Janela de login dos sites de vídeo (acesso a vídeos que exigem entrar). */
  platformLogin: PlatformLogin;
  settings: SettingsService;
  externalProviders: ExternalProvidersService;
  localProviders: LocalProvidersService;
  back: BackReaders;
}

/** Lista única de handlers do app. Cada fase acrescenta os seus aqui. */
export function createHandlers(deps: HandlerDeps): IpcHandler[] {
  return [
    new AppHandler(deps.appInfo),
    new SettingsHandler(deps.settings, deps.folderPicker, deps.libraryMover),
    new ExternalProvidersHandler(deps.externalProviders),
    new LocalProvidersHandler(deps.localProviders),
    new HealthHandler(deps.back.healthSystem, deps.back.healthAi),
    new AiHandler(deps.back.ai, deps.back.aiUsage),
    new ChatHandler(deps.back.chat),
    new LibraryHandler(deps.back.library, deps.back.libraryClassifier),
    new BookHandler(deps.back.books),
    new BackupHandler(deps.backup),
    new NoticeHandler(deps.notices),
    new ComponentsHandler(deps.components),
    new JobHandler(
      deps.back.jobs.catalog,
      deps.back.jobs.launcher,
      deps.back.jobs.deleter,
      deps.back.jobs.canceller,
      new JobAccess(deps.back.jobs.catalog, deps.platformLogin),
    ),
  ];
}
