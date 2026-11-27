import { JobAccess, type PlatformLogin } from '../../jobs/job-access';
import type { ExternalProvidersService } from '../../providers/external-providers.service';
import type { LocalProvidersService } from '../../providers/local-providers.service';
import type { SettingsService } from '../../settings/settings.service';
import type { EventPublisher } from '../event-publisher';
import type { IpcHandler } from '../ipc-handler';

import { AiHandler, type AiCatalog, type AiSelectionPort, type AiUsageSource } from './ai.handler';
import { AppHandler, type AppInfo } from './app.handler';
import { BackupHandler, type BackupPort } from './backup.handler';
import { ComponentsHandler, type ComponentsPort } from './components.handler';
import { PdfHandler, type PdfPort } from './pdf.handler';
import { PromptsHandler, type PromptsPort } from './prompts.handler';
import { JobLeftoversHandler, type JobLeftoversPort } from './leftovers.handler';
import { PlatformHandler, type PlatformLoginsPort } from './platform.handler';
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
import { InfographicHandler, type InfographicPort } from './infographic.handler';
import { MindMapHandler, type MindMapImagePort, type MindMapPort } from './mind-map.handler';
import { UpdatesHandler, type NotesTranslatorPort, type UpdatesPort } from './updates.handler';
import { SettingsHandler, type FolderPicker, type LibraryFolderPort } from './settings.handler';

/** Services do back (Nest) usados pelos handlers de leitura. */
export interface BackReaders {
  healthSystem: HealthCheckSource;
  healthAi: HealthCheckSource;
  ai: AiCatalog;
  aiUsage: AiUsageSource;
  aiSelection: AiSelectionPort;
  chat: ChatSource;
  library: LibraryReader & LibraryWriter;
  libraryClassifier: LibraryClassifierPort;
  mindMaps: MindMapPort;
  infographics: InfographicPort;
  prompts: PromptsPort;
  books: BookReader & BookWriter;
  jobs: {
    catalog: JobCatalogPort;
    launcher: JobLauncherPort;
    deleter: JobDeleterPort;
    canceller: JobCancellerPort;
    leftovers: JobLeftoversPort;
  };
}

export interface HandlerDeps {
  /** Eventos do main para a tela (ex.: a resposta do chat aos pedaços). */
  events?: EventPublisher;
  appInfo: AppInfo;
  folderPicker: FolderPicker;
  libraryMover: LibraryFolderPort;
  backup: BackupPort;
  /** Leitura do texto de PDFs (criar página a partir de um arquivo). */
  pdf: PdfPort;
  notices: PendingNotices;
  components: ComponentsPort;
  updates: UpdatesPort;
  /** Tradução das notas da atualização com a IA local. */
  notesTranslator: NotesTranslatorPort;
  /** Janela de login dos sites de vídeo (acesso a vídeos que exigem entrar). */
  platformLogin: PlatformLogin;
  platformLogins: PlatformLoginsPort;
  /** Salva a imagem PNG do mapa mental (diálogo "Salvar como" do sistema). */
  mindMapImages: MindMapImagePort;
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
    new AiHandler(deps.back.ai, deps.back.aiUsage, deps.back.aiSelection),
    new ChatHandler(deps.back.chat, deps.events),
    new LibraryHandler(deps.back.library, deps.back.libraryClassifier),
    new MindMapHandler(deps.back.mindMaps, deps.mindMapImages),
    new InfographicHandler(deps.back.infographics),
    new PromptsHandler(deps.back.prompts),
    new BookHandler(deps.back.books),
    new BackupHandler(deps.backup),
    new PdfHandler(deps.pdf),
    new JobLeftoversHandler(deps.back.jobs.leftovers),
    new NoticeHandler(deps.notices),
    new ComponentsHandler(deps.components),
    new UpdatesHandler(deps.updates, deps.notesTranslator),
    new PlatformHandler(deps.platformLogins),
    new JobHandler(
      deps.back.jobs.catalog,
      deps.back.jobs.launcher,
      deps.back.jobs.deleter,
      deps.back.jobs.canceller,
      new JobAccess(deps.back.jobs.catalog, deps.platformLogin),
    ),
  ];
}
