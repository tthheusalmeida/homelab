import { IpcChannels } from '../../shared/channels';
import type {
  BookDetail,
  BookReading,
  BookSearchHit,
  BookSummary,
} from '../../shared/contracts/books';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta de leitura do `BookService` do back. */
export interface BookReader {
  list(documentId?: string): Promise<BookSummary[]>;
  get(id: string): Promise<BookDetail>;
  read(id: string): Promise<BookReading>;
  search(id: string, query: string): Promise<BookSearchHit[]>;
}

/**
 * Canais de leitura `library:books:*` (lista, livro, modo leitura e pesquisa no livro).
 * Livro inexistente chega como 404 do Nest (`NOT_FOUND`) pelo `IpcErrorMapper`.
 */
export class BookHandler extends IpcHandler {
  constructor(private readonly books: BookReader) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.library.books.list, ({ documentId }) => this.books.list(documentId)),
      this.route(IpcChannels.library.books.get, ({ id }) => this.books.get(id)),
      this.route(IpcChannels.library.books.read, ({ id }) => this.books.read(id)),
      this.route(IpcChannels.library.books.search, ({ id, q }) => this.books.search(id, q ?? '')),
    ];
  }
}
