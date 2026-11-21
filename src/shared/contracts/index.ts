import type { IpcChannel, IpcChannels } from '../channels';

import type {
  AiModelEntry,
  AiModelsRequest,
  AiProviderEntry,
  AiThinkingEntry,
  AiThinkingRequest,
  AiUsageReport,
  AiUsageRequestFilter,
} from './ai';
import type {
  BookAddChapterRequest,
  BookCreateRequest,
  BookDetail,
  BookListRequest,
  BookMarkChapterReadRequest,
  BookReading,
  BookRequest,
  BookSearchHit,
  BookSearchRequest,
  BookSetPositionRequest,
  BookSetStructureRequest,
  BookSummary,
  BookUpdateRequest,
} from './books';
import type { ComponentRequest, ComponentsInstallRequest, ComponentsStatus } from './components';
import type {
  SetAutoCheckRequest,
  TranslatedNotes,
  TranslationAvailability,
  UpdateStatus,
} from './updates';
import type {
  BackupCreateRequest,
  BackupCreateResult,
  BackupInspection,
  BackupPreview,
  BackupRestoreRequest,
  BackupRestoreResult,
} from './backup';
import type {
  ChatCancelRequest,
  ChatDetail,
  ChatRequest,
  ChatSendRequest,
  ChatSendResponse,
  ChatSummary,
} from './chat';
import type { AppNotice } from './events';
import type { HealthReport } from './health';
import type {
  CreateVideoToSummaryRequest,
  CreateVideoToTranscriptRequest,
  JobCreated,
  JobDeleteRequest,
  JobAccessResult,
  JobCancelResult,
  JobDeleteResult,
  JobUndoDeleteResult,
  JobRequest,
  JobTypeView,
  JobView,
} from './jobs';
import type { PlatformLoginsResult } from './platform';
import type {
  LibraryCategoryNode,
  LibraryClassificationSuggestion,
  LibraryCategoryPathRequest,
  LibraryRenameCategoryRequest,
  LibraryRenameCategoryResult,
  LibraryCreateArticleRequest,
  LibraryDocumentDetail,
  LibraryDocumentRequest,
  LibraryDocumentSummary,
  LibraryIndexStatus,
  LibraryInfographic,
  LibraryInfographicRequest,
  LibraryInfographicSaveRequest,
  LibraryListFilters,
  LibraryMindMap,
  LibraryMindMapImageRequest,
  LibraryMindMapImageResult,
  LibraryMindMapRequest,
  LibraryMindMapSaveRequest,
  LibraryPublishRequest,
  LibraryRebuildResult,
  LibrarySuggestRequest,
  LibraryTagCount,
  LibraryUpdateRequest,
} from './library';
import type {
  ExternalProviderInfo,
  ExternalProviderSaveRequest,
  ExternalProviderSaveResult,
  ExternalProviderTestRequest,
  LocalProviderInfo,
  LocalProviderSaveRequest,
  LocalProviderSaveResult,
  LocalProviderTestRequest,
  ProviderTestResult,
} from './providers';
import type { Appearance, AppearancePatch } from './appearance';
import type {
  LibraryFolderInfo,
  MoveLibraryRequest,
  MoveLibraryResult,
  SaveResult,
  SettingsPaths,
  SupportSettings,
} from './settings';

/**
 * Contrato de cada canal: payload (`request`) e retorno (`response`).
 * Cada fase acrescenta aqui os canais do seu domínio.
 */
export interface IpcContracts {
  [IpcChannels.app.ping]: { request: void; response: 'pong' };
  [IpcChannels.app.version]: { request: void; response: string };
  [IpcChannels.app.relaunch]: { request: void; response: void };
  /** Abre (ou foca) as Configurações; com `section`, já na seção pedida (ex.: `components`). */
  [IpcChannels.app.openSettings]: { request: { section?: string } | void; response: void };
  /** Mostra um arquivo salvo na pasta dele, no gerenciador de arquivos do sistema (o botão "Ver" dos avisos). `false` se o arquivo não existe mais. */
  [IpcChannels.app.revealFile]: { request: { path: string }; response: boolean };
  /** Seção pedida ao abrir as Configurações (entregue uma vez só; `null` se não houve pedido). */
  [IpcChannels.app.settingsSection]: { request: void; response: string | null };
  /** Se alguma alteração salva só vale depois de reiniciar (vale para todas as janelas). */
  [IpcChannels.app.restartPending]: { request: void; response: boolean };
  /** Marca que há reinício pendente e avisa todas as janelas (evento `app:restart-needed`). */
  [IpcChannels.app.markRestartPending]: { request: void; response: void };

  [IpcChannels.settings.get]: { request: void; response: SettingsPaths };
  [IpcChannels.settings.update]: {
    request: Partial<SettingsPaths>;
    response: SaveResult<SettingsPaths>;
  };

  [IpcChannels.appearance.get]: { request: void; response: Appearance };
  [IpcChannels.appearance.update]: { request: AppearancePatch; response: Appearance };

  [IpcChannels.support.get]: { request: void; response: SupportSettings };
  [IpcChannels.support.update]: { request: Partial<SupportSettings>; response: SupportSettings };

  /** Abre o seletor de pasta do sistema; `null` se o usuário cancelar. */
  [IpcChannels.settings.pickFolder]: {
    request: { defaultPath?: string };
    response: string | null;
  };

  /** Diz o que há numa pasta candidata a biblioteca (vazia, com arquivos...). */
  [IpcChannels.settings.inspectLibrary]: {
    request: { path: string };
    response: LibraryFolderInfo;
  };
  /** Troca a pasta da biblioteca, movendo os arquivos (com progresso em `library-move:progress`) ou só usando a pasta. */
  [IpcChannels.settings.moveLibrary]: { request: MoveLibraryRequest; response: MoveLibraryResult };

  [IpcChannels.health.system]: { request: void; response: HealthReport };
  [IpcChannels.health.ai]: { request: void; response: HealthReport };

  [IpcChannels.ai.providers]: { request: void; response: AiProviderEntry[] };
  [IpcChannels.ai.models]: { request: AiModelsRequest; response: AiModelEntry[] };
  [IpcChannels.ai.thinking]: { request: AiThinkingRequest; response: AiThinkingEntry[] };
  [IpcChannels.ai.usage]: { request: AiUsageRequestFilter; response: AiUsageReport };

  /** Avisos criados enquanto o app abria (entregues uma vez só). Os seguintes chegam pelo evento `app:notice`. */
  [IpcChannels.notices.pending]: { request: void; response: AppNotice[] };
  /** Lista de componentes (Whisper, ffmpeg, CUDA, modelos) com estado, hardware e recomendação. */
  [IpcChannels.components.status]: { request: void; response: ComponentsStatus };
  /** Baixa e instala os componentes escolhidos; o progresso vai em `components:progress`. */
  [IpcChannels.components.install]: {
    request: ComponentsInstallRequest;
    response: ComponentsStatus;
  };
  /** Cancela a instalação em andamento. */
  [IpcChannels.components.cancel]: { request: void; response: void };
  /** Remove um componente opcional (modelo ou pacote CUDA). */
  [IpcChannels.components.remove]: { request: ComponentRequest; response: ComponentsStatus };
  /** Escolhe o modelo do Whisper em uso. */
  [IpcChannels.components.setActiveModel]: {
    request: ComponentRequest;
    response: ComponentsStatus;
  };

  /** Estado da atualização do app (versão instalada, nova versão, progresso, erro). */
  [IpcChannels.updates.status]: { request: void; response: UpdateStatus };
  /** Consulta o GitHub agora e devolve o estado. */
  [IpcChannels.updates.check]: { request: void; response: UpdateStatus };
  /**
   * Com a versão nova pronta (`ready`), reinicia e instala. Se o download automático falhou
   * (`available`), baixa só a diferença; o progresso vai em `updates:changed`.
   */
  [IpcChannels.updates.install]: { request: void; response: UpdateStatus };
  /** Liga ou desliga a verificação automática (a manual continua funcionando). */
  [IpcChannels.updates.setAutoCheck]: { request: SetAutoCheckRequest; response: UpdateStatus };
  /** Diz se dá para traduzir as notas: só com a IA local (Ollama) ligada e com um modelo de texto. */
  [IpcChannels.updates.translationAvailable]: { request: void; response: TranslationAvailability };
  /**
   * Traduz para português as notas da versão nova, com o menor modelo do Ollama. Sem IA local:
   * `NOT_CONFIGURED`; falha do modelo: `PROVIDER_FAILED`. Sem versão nova: `VALIDATION`.
   */
  [IpcChannels.updates.translateNotes]: { request: void; response: TranslatedNotes };

  /** Mostra o que dá para incluir no backup, com tamanhos, e o que não entra. */
  [IpcChannels.backup.preview]: { request: void; response: BackupPreview };
  /** Pergunta onde salvar e cria o zip, com progresso em `backup:progress`. */
  [IpcChannels.backup.create]: { request: BackupCreateRequest; response: BackupCreateResult };
  /** Cancela o backup ou a restauração em andamento (o zip parcial é apagado). */
  [IpcChannels.backup.cancel]: { request: void; response: void };
  /** Pergunta qual zip abrir e devolve o que há nele; `null` se o usuário cancelar. */
  [IpcChannels.backup.inspect]: { request: void; response: BackupInspection | null };
  /** Restaura os itens escolhidos do zip aberto por `backup:inspect`. */
  [IpcChannels.backup.restore]: { request: BackupRestoreRequest; response: BackupRestoreResult };

  /** Envia a mensagem com o histórico inteiro do chat; o chat nasce na primeira mensagem. */
  [IpcChannels.chat.send]: { request: ChatSendRequest; response: ChatSendResponse };
  /** Descarta a resposta que ainda está sendo gerada para o chat (a chamada ao provedor não é interrompida). */
  [IpcChannels.chat.cancel]: { request: ChatCancelRequest; response: void };
  [IpcChannels.chats.list]: { request: void; response: ChatSummary[] };
  [IpcChannels.chats.get]: { request: ChatRequest; response: ChatDetail };
  [IpcChannels.chats.delete]: { request: ChatRequest; response: void };

  [IpcChannels.library.documents.list]: {
    request: LibraryListFilters;
    response: LibraryDocumentSummary[];
  };
  [IpcChannels.library.documents.get]: {
    request: LibraryDocumentRequest;
    response: LibraryDocumentDetail;
  };
  [IpcChannels.library.documents.createArticle]: {
    request: LibraryCreateArticleRequest;
    response: LibraryDocumentDetail;
  };
  [IpcChannels.library.documents.publish]: {
    request: LibraryPublishRequest;
    response: LibraryDocumentDetail;
  };
  [IpcChannels.library.documents.update]: {
    request: LibraryUpdateRequest;
    response: LibraryDocumentDetail;
  };
  [IpcChannels.library.documents.suggest]: {
    request: LibrarySuggestRequest;
    response: LibraryClassificationSuggestion;
  };
  [IpcChannels.library.documents.archive]: {
    request: LibraryDocumentRequest;
    response: LibraryDocumentDetail;
  };
  [IpcChannels.library.documents.delete]: { request: LibraryDocumentRequest; response: void };
  [IpcChannels.library.mindMap.get]: {
    request: LibraryDocumentRequest;
    response: LibraryMindMap | null;
  };
  [IpcChannels.library.mindMap.generate]: {
    request: LibraryMindMapRequest;
    response: LibraryMindMap;
  };
  [IpcChannels.library.mindMap.save]: {
    request: LibraryMindMapSaveRequest;
    response: LibraryMindMap;
  };
  [IpcChannels.library.mindMap.saveImage]: {
    request: LibraryMindMapImageRequest;
    response: LibraryMindMapImageResult;
  };
  [IpcChannels.library.mindMap.delete]: { request: LibraryDocumentRequest; response: void };
  [IpcChannels.library.infographic.get]: {
    request: LibraryDocumentRequest;
    response: LibraryInfographic | null;
  };
  [IpcChannels.library.infographic.generate]: {
    request: LibraryInfographicRequest;
    response: LibraryInfographic;
  };
  [IpcChannels.library.infographic.save]: {
    request: LibraryInfographicSaveRequest;
    response: LibraryInfographic;
  };
  [IpcChannels.library.infographic.delete]: { request: LibraryDocumentRequest; response: void };
  [IpcChannels.library.reindex]: { request: void; response: LibraryRebuildResult };
  [IpcChannels.library.books.list]: { request: BookListRequest; response: BookSummary[] };
  [IpcChannels.library.books.get]: { request: BookRequest; response: BookDetail };
  [IpcChannels.library.books.read]: { request: BookRequest; response: BookReading };
  [IpcChannels.library.books.search]: { request: BookSearchRequest; response: BookSearchHit[] };
  [IpcChannels.library.books.create]: { request: BookCreateRequest; response: BookDetail };
  [IpcChannels.library.books.update]: { request: BookUpdateRequest; response: BookDetail };
  [IpcChannels.library.books.delete]: { request: BookRequest; response: void };
  [IpcChannels.library.books.setStructure]: {
    request: BookSetStructureRequest;
    response: BookDetail;
  };
  [IpcChannels.library.books.addChapter]: {
    request: BookAddChapterRequest;
    response: BookDetail;
  };
  [IpcChannels.library.books.markChapterRead]: {
    request: BookMarkChapterReadRequest;
    response: BookDetail;
  };
  [IpcChannels.library.books.resetProgress]: { request: BookRequest; response: BookDetail };
  [IpcChannels.library.books.setPosition]: {
    request: BookSetPositionRequest;
    response: BookDetail;
  };
  [IpcChannels.jobs.list]: { request: void; response: JobView[] };
  [IpcChannels.jobs.types]: { request: void; response: JobTypeView[] };
  [IpcChannels.jobs.get]: { request: JobRequest; response: JobView };
  [IpcChannels.jobs.createVideoToTranscript]: {
    request: CreateVideoToTranscriptRequest;
    response: JobCreated;
  };
  [IpcChannels.jobs.createVideoToSummary]: {
    request: CreateVideoToSummaryRequest;
    response: JobCreated;
  };
  /** Exclui jobs do histórico (só os que não estão na fila nem rodando). */
  [IpcChannels.jobs.delete]: { request: JobDeleteRequest; response: JobDeleteResult };
  [IpcChannels.jobs.deleteAll]: { request: void; response: JobDeleteResult };
  /** Desfaz a última exclusão (guardada só enquanto o app está aberto). */
  [IpcChannels.jobs.undoDelete]: { request: void; response: JobUndoDeleteResult };
  /** Cancela um job na fila (sai da fila) ou rodando (para ao fim da etapa em andamento). */
  [IpcChannels.jobs.cancel]: { request: JobRequest; response: JobCancelResult };
  /** Cria um job novo com os mesmos dados de um que falhou. */
  [IpcChannels.jobs.retry]: { request: JobRequest; response: JobCreated };
  /** Abre a janela de login do site do vídeo; ao fechá-la, guarda o acesso para o próximo download. */
  [IpcChannels.jobs.grantAccess]: { request: JobRequest; response: JobAccessResult };

  /** Apaga os logins guardados dos sites de vídeo (o usuário entra de novo na próxima vez). */
  [IpcChannels.platform.forgetLogins]: { request: void; response: PlatformLoginsResult };

  [IpcChannels.library.inbox]: { request: void; response: LibraryDocumentSummary[] };
  [IpcChannels.library.categories]: { request: void; response: LibraryCategoryNode[] };
  /** Renomeia ou move uma categoria; as páginas dela mudam de pasta junto. */
  [IpcChannels.library.renameCategory]: {
    request: LibraryRenameCategoryRequest;
    response: LibraryRenameCategoryResult;
  };
  /** Cria uma categoria vazia, em qualquer lugar (os níveis que faltarem também). */
  [IpcChannels.library.createCategory]: {
    request: LibraryCategoryPathRequest;
    response: { created: true };
  };
  /** Exclui uma categoria sem páginas (e as subcategorias vazias dela). */
  [IpcChannels.library.deleteCategory]: {
    request: LibraryCategoryPathRequest;
    response: { deleted: true };
  };
  [IpcChannels.library.tags]: { request: void; response: LibraryTagCount[] };
  [IpcChannels.library.index]: { request: void; response: LibraryIndexStatus };

  [IpcChannels.providers.external.list]: { request: void; response: ExternalProviderInfo[] };
  [IpcChannels.providers.external.get]: {
    request: { id: ExternalProviderInfo['id'] };
    response: ExternalProviderInfo;
  };
  [IpcChannels.providers.external.save]: {
    request: ExternalProviderSaveRequest;
    response: ExternalProviderSaveResult;
  };
  [IpcChannels.providers.external.test]: {
    request: ExternalProviderTestRequest;
    response: ProviderTestResult;
  };

  [IpcChannels.providers.local.list]: { request: void; response: LocalProviderInfo[] };
  [IpcChannels.providers.local.get]: {
    request: { id: LocalProviderInfo['id'] };
    response: LocalProviderInfo;
  };
  [IpcChannels.providers.local.save]: {
    request: LocalProviderSaveRequest;
    response: LocalProviderSaveResult;
  };
  [IpcChannels.providers.local.test]: {
    request: LocalProviderTestRequest;
    response: ProviderTestResult;
  };
}

export type IpcRequest<C extends IpcChannel> = IpcContracts[C]['request'];
export type IpcResponse<C extends IpcChannel> = IpcContracts[C]['response'];
