import { IpcChannels } from '../../shared/channels';
import type {
  LibraryCategoryNode,
  LibraryClassificationSuggestion,
  LibraryCreateArticleRequest,
  LibraryDocumentDetail,
  LibraryDocumentSummary,
  LibraryIndexStatus,
  LibraryListFilters,
  LibraryPublishRequest,
  LibraryRebuildResult,
  LibraryTagCount,
  LibraryUpdateRequest,
} from '../../shared/contracts/library';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

import { optionalStringList, requireStringList } from './library-payload';

/** Porta de leitura do `LibraryService` do back. */
export interface LibraryReader {
  list(filters: LibraryListFilters): Promise<LibraryDocumentSummary[]>;
  inbox(): LibraryDocumentSummary[];
  get(id: string): Promise<LibraryDocumentDetail>;
  categories(): LibraryCategoryNode[];
  tags(): LibraryTagCount[];
  indexStatus(): LibraryIndexStatus;
}

/** Porta de escrita do `LibraryService` do back (as regras de nome, categoria e frontmatter ficam lá). */
export interface LibraryWriter {
  reindex(): Promise<LibraryRebuildResult>;
  createArticle(input: LibraryCreateArticleRequest): Promise<LibraryDocumentDetail>;
  publish(id: string, input: Omit<LibraryPublishRequest, 'id'>): Promise<LibraryDocumentDetail>;
  update(id: string, input: Omit<LibraryUpdateRequest, 'id'>): Promise<LibraryDocumentDetail>;
  archive(id: string): Promise<LibraryDocumentDetail>;
  discard(id: string): Promise<void>;
}

/** Porta do `LibraryClassifier` do back (sugestão de título, categoria e tags pela IA). */
export interface LibraryClassifierPort {
  suggest(id: string, modelId?: string): Promise<LibraryClassificationSuggestion>;
}

/**
 * Canais `library:*`. Documento inexistente chega como 404 do Nest (`NOT_FOUND`), regra de
 * negócio violada (título vazio, documento já publicado etc.) como 400 (`VALIDATION`) e falha da
 * IA na sugestão como 502 (`PROVIDER_FAILED`), todos pelo `IpcErrorMapper`. O handler só valida
 * que categoria e tags são listas de textos, como o controller fazia.
 */
export class LibraryHandler extends IpcHandler {
  constructor(
    private readonly library: LibraryReader & LibraryWriter,
    private readonly classifier: LibraryClassifierPort,
  ) {
    super();
  }

  routes(): IpcRoute[] {
    return [...this.readRoutes(), ...this.writeRoutes()];
  }

  private readRoutes(): IpcRoute[] {
    return [
      this.route(IpcChannels.library.documents.list, (filters) => this.library.list(filters)),
      this.route(IpcChannels.library.documents.get, ({ id }) => this.library.get(id)),
      this.route(IpcChannels.library.inbox, () => this.library.inbox()),
      this.route(IpcChannels.library.categories, () => this.library.categories()),
      this.route(IpcChannels.library.tags, () => this.library.tags()),
      this.route(IpcChannels.library.index, () => this.library.indexStatus()),
    ];
  }

  private writeRoutes(): IpcRoute[] {
    return [
      this.route(IpcChannels.library.reindex, () => this.library.reindex()),
      this.route(IpcChannels.library.documents.createArticle, (body) =>
        this.library.createArticle({
          title: body.title,
          category: requireStringList(body.category, 'category'),
          tags: optionalStringList(body.tags, 'tags'),
          content: body.content,
        }),
      ),
      this.route(IpcChannels.library.documents.publish, ({ id, ...body }) =>
        this.library.publish(id, {
          title: body.title,
          category: requireStringList(body.category, 'category'),
          tags: optionalStringList(body.tags, 'tags'),
        }),
      ),
      this.route(IpcChannels.library.documents.update, ({ id, ...body }) =>
        this.library.update(id, {
          title: body.title,
          category: optionalStringList(body.category, 'category'),
          tags: optionalStringList(body.tags, 'tags'),
          content: body.content,
        }),
      ),
      this.route(IpcChannels.library.documents.suggest, ({ id, modelId }) =>
        this.classifier.suggest(id, modelId),
      ),
      this.route(IpcChannels.library.documents.archive, ({ id }) => this.library.archive(id)),
      this.route(IpcChannels.library.documents.delete, ({ id }) => this.library.discard(id)),
    ];
  }
}
