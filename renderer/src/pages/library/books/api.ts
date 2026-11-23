import type {
  BookDetail,
  BookPosition,
  BookReading,
  BookSummary,
  CreateBookInput,
  ModuleDraft,
  UpdateBookInput,
} from './types';

import { IpcChannels } from '#shared/channels';
import { ipc } from '#lib/ipc';

/**
 * Corpo por IPC (fases 07a e 07b): leitura e
 * escrita dos livros. Mesmas assinaturas; o `:id` da rota virou campo do payload.
 */

export function getBooks(documentId?: string): Promise<BookSummary[]> {
  return ipc.invoke(IpcChannels.library.books.list, documentId ? { documentId } : {});
}

export function getBook(id: string): Promise<BookDetail> {
  return ipc.invoke(IpcChannels.library.books.get, { id });
}

export function readBook(id: string): Promise<BookReading> {
  return ipc.invoke(IpcChannels.library.books.read, { id });
}

export function createBook(input: CreateBookInput): Promise<BookDetail> {
  return ipc.invoke(IpcChannels.library.books.create, input);
}

export function updateBook(id: string, input: UpdateBookInput): Promise<BookDetail> {
  return ipc.invoke(IpcChannels.library.books.update, { id, ...input });
}

export function deleteBook(id: string): Promise<void> {
  return ipc.invoke(IpcChannels.library.books.delete, { id });
}

export function setBookStructure(id: string, modules: ModuleDraft[]): Promise<BookDetail> {
  return ipc.invoke(IpcChannels.library.books.setStructure, { id, modules });
}

export function addBookChapter(
  id: string,
  documentId: string,
  moduleId?: string,
): Promise<BookDetail> {
  return ipc.invoke(
    IpcChannels.library.books.addChapter,
    moduleId ? { id, documentId, moduleId } : { id, documentId },
  );
}

export function setChapterRead(id: string, documentId: string, read: boolean): Promise<BookDetail> {
  return ipc.invoke(IpcChannels.library.books.markChapterRead, { id, documentId, read });
}

/** Zera o progresso do livro (capítulos lidos, posição e conclusão). */
export function resetBookProgress(id: string): Promise<BookDetail> {
  return ipc.invoke(IpcChannels.library.books.resetProgress, { id });
}

export function saveBookPosition(id: string, position: BookPosition): Promise<BookDetail> {
  return ipc.invoke(IpcChannels.library.books.setPosition, { id, ...position });
}
