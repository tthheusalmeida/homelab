import { IpcChannels } from '../../shared/channels';
import type {
  LibraryCategoryNode,
  LibraryDocumentDetail,
  LibraryDocumentSummary,
  LibraryIndexStatus,
  LibraryListFilters,
  LibraryTagCount,
} from '../../shared/contracts/library';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta de leitura do `LibraryService` do back. */
export interface LibraryReader {
  list(filters: LibraryListFilters): Promise<LibraryDocumentSummary[]>;
  inbox(): LibraryDocumentSummary[];
  get(id: string): Promise<LibraryDocumentDetail>;
  categories(): LibraryCategoryNode[];
  tags(): LibraryTagCount[];
  indexStatus(): LibraryIndexStatus;
}

/**
 * Canais de leitura `library:*` (acervo, documento, entrada, categorias, tags e índice).
 * Documento inexistente chega como 404 do Nest (`NOT_FOUND`) e filtro inválido como 400
 * (`VALIDATION`), ambos pelo `IpcErrorMapper`.
 */
export class LibraryHandler extends IpcHandler {
  constructor(private readonly library: LibraryReader) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.library.documents.list, (filters) => this.library.list(filters)),
      this.route(IpcChannels.library.documents.get, ({ id }) => this.library.get(id)),
      this.route(IpcChannels.library.inbox, () => this.library.inbox()),
      this.route(IpcChannels.library.categories, () => this.library.categories()),
      this.route(IpcChannels.library.tags, () => this.library.tags()),
      this.route(IpcChannels.library.index, () => this.library.indexStatus()),
    ];
  }
}
