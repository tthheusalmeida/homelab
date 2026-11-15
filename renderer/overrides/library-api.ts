import type {
  CategoryNode,
  ClassificationSuggestion,
  CreateArticleInput,
  DocumentDetail,
  DocumentSummary,
  IndexStatus,
  LibraryFilters,
  PublishInput,
  TagCount,
  UpdateDocumentInput,
} from '@front/pages/library/types/library.types';

import { IpcChannels } from '../../src/shared/channels';
import type { LibraryListFilters } from '../../src/shared/contracts/library';
import { ipc } from '../ipc';

/**
 * Cópia de `front/src/pages/library/api/library.ts` com o corpo por IPC (fases 06a e 06b): leitura
 * e escrita da biblioteca. Mesmas assinaturas; o `:id` da rota virou campo do payload.
 */

/** Mesmas regras de `buildDocumentsQuery`: texto aparado, vazio omitido, listas só se houver itens. */
export function toListFilters(filters: LibraryFilters = {}): LibraryListFilters {
  const payload: LibraryListFilters = {};
  const text = filters.q?.trim();

  if (text) payload.q = text;
  if (filters.category?.length) payload.category = filters.category;
  if (filters.tags?.length) payload.tags = filters.tags;
  if (filters.type) payload.type = filters.type;
  if (filters.source) payload.source = filters.source;
  if (filters.status) payload.status = filters.status;
  if (filters.sort) payload.sort = filters.sort;

  return payload;
}

export function getDocuments(filters: LibraryFilters = {}): Promise<DocumentSummary[]> {
  return ipc.invoke(IpcChannels.library.documents.list, toListFilters(filters));
}

export function getDocument(id: string): Promise<DocumentDetail> {
  return ipc.invoke(IpcChannels.library.documents.get, { id });
}

export function getInbox(): Promise<DocumentSummary[]> {
  return ipc.invoke(IpcChannels.library.inbox);
}

export function getCategories(): Promise<CategoryNode[]> {
  return ipc.invoke(IpcChannels.library.categories);
}

export function getTags(): Promise<TagCount[]> {
  return ipc.invoke(IpcChannels.library.tags);
}

export function getIndexStatus(): Promise<IndexStatus> {
  return ipc.invoke(IpcChannels.library.index);
}

export function reindex(): Promise<{ indexed: number; errors: IndexStatus['errors'] }> {
  return ipc.invoke(IpcChannels.library.reindex);
}

export function publishDocument(id: string, input: PublishInput): Promise<DocumentDetail> {
  return ipc.invoke(IpcChannels.library.documents.publish, { id, ...input });
}

export function archiveDocument(id: string): Promise<DocumentDetail> {
  return ipc.invoke(IpcChannels.library.documents.archive, { id });
}

export function discardDocument(id: string): Promise<void> {
  return ipc.invoke(IpcChannels.library.documents.delete, { id });
}

export function createArticle(input: CreateArticleInput): Promise<DocumentDetail> {
  return ipc.invoke(IpcChannels.library.documents.createArticle, input);
}

export function suggestClassification(
  id: string,
  modelId?: string,
): Promise<ClassificationSuggestion> {
  return ipc.invoke(IpcChannels.library.documents.suggest, modelId ? { id, modelId } : { id });
}

export function updateDocument(id: string, input: UpdateDocumentInput): Promise<DocumentDetail> {
  return ipc.invoke(IpcChannels.library.documents.update, { id, ...input });
}
