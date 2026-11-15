import { IpcChannels } from '../../shared/channels';
import type {
  BookCreateRequest,
  BookDetail,
  BookModuleDraft,
  BookPosition,
  BookReading,
  BookSearchHit,
  BookSummary,
  BookUpdateRequest,
} from '../../shared/contracts/books';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

import { requireModules } from './book-payload';

/** Porta de leitura do `BookService` do back. */
export interface BookReader {
  list(documentId?: string): Promise<BookSummary[]>;
  get(id: string): Promise<BookDetail>;
  read(id: string): Promise<BookReading>;
  search(id: string, query: string): Promise<BookSearchHit[]>;
}

/** Porta de escrita do `BookService` do back (as regras de módulos, capítulos e progresso ficam lá). */
export interface BookWriter {
  create(input: BookCreateRequest): Promise<BookDetail>;
  update(id: string, input: Omit<BookUpdateRequest, 'id'>): Promise<BookDetail>;
  remove(id: string): Promise<void>;
  setStructure(id: string, modules: BookModuleDraft[]): Promise<BookDetail>;
  addChapter(id: string, documentId: string, moduleId?: string): Promise<BookDetail>;
  setChapterRead(id: string, documentId: string, read: boolean): Promise<BookDetail>;
  resetProgress(id: string): Promise<BookDetail>;
  saveLastPosition(id: string, position: BookPosition): Promise<BookDetail>;
}

/**
 * Canais `library:books:*`. Livro ou capítulo inexistente chega como 404 do Nest (`NOT_FOUND`) e
 * regra violada (título vazio, tipo inválido, documento fora da biblioteca etc.) como 400
 * (`VALIDATION`), ambos pelo `IpcErrorMapper`. O handler só valida que `modules` é uma lista,
 * como o controller fazia.
 */
export class BookHandler extends IpcHandler {
  constructor(private readonly books: BookReader & BookWriter) {
    super();
  }

  routes(): IpcRoute[] {
    return [...this.readRoutes(), ...this.writeRoutes()];
  }

  private readRoutes(): IpcRoute[] {
    return [
      this.route(IpcChannels.library.books.list, ({ documentId }) => this.books.list(documentId)),
      this.route(IpcChannels.library.books.get, ({ id }) => this.books.get(id)),
      this.route(IpcChannels.library.books.read, ({ id }) => this.books.read(id)),
      this.route(IpcChannels.library.books.search, ({ id, q }) => this.books.search(id, q ?? '')),
    ];
  }

  private writeRoutes(): IpcRoute[] {
    return [
      this.route(IpcChannels.library.books.create, (input) => this.books.create(input)),
      this.route(IpcChannels.library.books.update, ({ id, ...input }) =>
        this.books.update(id, input),
      ),
      this.route(IpcChannels.library.books.delete, ({ id }) => this.books.remove(id)),
      this.route(IpcChannels.library.books.setStructure, ({ id, modules }) =>
        this.books.setStructure(id, requireModules<BookModuleDraft>(modules)),
      ),
      this.route(IpcChannels.library.books.addChapter, ({ id, documentId, moduleId }) =>
        this.books.addChapter(id, documentId, moduleId),
      ),
      this.route(IpcChannels.library.books.markChapterRead, ({ id, documentId, read }) =>
        this.books.setChapterRead(id, documentId, read),
      ),
      this.route(IpcChannels.library.books.resetProgress, ({ id }) => this.books.resetProgress(id)),
      this.route(IpcChannels.library.books.setPosition, ({ id, documentId, elementId }) =>
        this.books.saveLastPosition(id, { documentId, elementId }),
      ),
    ];
  }
}
