import { api } from '#lib/api';

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
 * Cópia de `front/src/pages/library/api/library.ts` da fase 06a: as **leituras** vão por IPC e a
 * escrita (reindex, publicar, arquivar, descartar, criar, sugerir, editar) segue por HTTP até a
 * 06b. As duas partes usam o mesmo índice do back, então não há conflito.
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

// --- Escrita: continua por HTTP até a fase 06b ---

export function reindex() {
  return api<{ indexed: number; errors: IndexStatus['errors'] }>('/library/reindex', {
    method: 'POST',
  });
}

export function publishDocument(id: string, input: PublishInput) {
  return api<DocumentDetail>(`/library/documents/${encodeURIComponent(id)}/publish`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function archiveDocument(id: string) {
  return api<DocumentDetail>(`/library/documents/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
  });
}

export function discardDocument(id: string) {
  return api<void>(`/library/documents/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function createArticle(input: CreateArticleInput) {
  return api<DocumentDetail>('/library/documents/article', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function suggestClassification(id: string, modelId?: string) {
  return api<ClassificationSuggestion>(`/library/documents/${encodeURIComponent(id)}/suggest`, {
    method: 'POST',
    body: JSON.stringify(modelId ? { modelId } : {}),
  });
}

export function updateDocument(id: string, input: UpdateDocumentInput) {
  return api<DocumentDetail>(`/library/documents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
