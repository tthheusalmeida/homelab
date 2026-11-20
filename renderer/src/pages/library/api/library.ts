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
} from '../types/library.types';

import { IpcChannels } from '#shared/channels';
import type {
  LibraryInfographic,
  LibraryInfographicInput,
  LibraryListFilters,
  LibraryMindMap,
  LibraryMindMapImageResult,
  LibraryMindMapNode,
} from '#shared/contracts/library';
import type { InfographicLayoutId } from '#shared/infographic-layouts';
import { ipc } from '#lib/ipc';

/**
 * Corpo por IPC (fases 06a e 06b): leitura
 * e escrita da biblioteca. Mesmas assinaturas; o `:id` da rota virou campo do payload.
 */

/** Mesmas regras de `buildDocumentsQuery`: texto aparado, vazio omitido, listas só se houver itens. */
export function toListFilters(filters: LibraryFilters = {}): LibraryListFilters {
  const payload: LibraryListFilters = {};
  const text = filters.q?.trim();

  if (text) payload.q = text;
  if (filters.category?.length) payload.category = filters.category;
  if (filters.tags?.length) payload.tags = filters.tags;
  if (filters.has?.length) payload.has = filters.has;
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

/** O mapa mental guardado do resumo, ou `null` se ainda não foi gerado. */
export function getMindMap(id: string): Promise<LibraryMindMap | null> {
  return ipc.invoke(IpcChannels.library.mindMap.get, { id });
}

/** Apaga só o mapa mental do resumo (o resumo e o infográfico ficam). */
export function deleteMindMap(id: string): Promise<void> {
  return ipc.invoke(IpcChannels.library.mindMap.delete, { id });
}

/** Guarda o infográfico como o usuário o editou (peças trocadas); volta o que ficou guardado. */
export function saveInfographic(
  id: string,
  infographic: LibraryInfographicInput,
): Promise<LibraryInfographic> {
  return ipc.invoke(IpcChannels.library.infographic.save, { id, infographic });
}

/** Apaga só o infográfico do resumo (o resumo e o mapa mental ficam). */
export function deleteInfographic(id: string): Promise<void> {
  return ipc.invoke(IpcChannels.library.infographic.delete, { id });
}

/** Pede à IA o mapa mental do resumo (gera de novo se já havia um). */
export function generateMindMap(id: string, modelId?: string): Promise<LibraryMindMap> {
  return ipc.invoke(IpcChannels.library.mindMap.generate, modelId ? { id, modelId } : { id });
}

/** Guarda o mapa como o usuário o editou (termos, frases, subtítulo, nós a mais ou a menos). */
export function saveMindMap(
  id: string,
  map: { subtitle?: string; nodes: LibraryMindMapNode[] },
): Promise<LibraryMindMap> {
  return ipc.invoke(IpcChannels.library.mindMap.save, { id, ...map });
}

/** Pede ao main o diálogo "Salvar como" e grava a imagem PNG do mapa (`saved: false` se o usuário cancelou). */
export function saveMindMapImage(
  fileName: string,
  dataBase64: string,
): Promise<LibraryMindMapImageResult> {
  return ipc.invoke(IpcChannels.library.mindMap.saveImage, { fileName, dataBase64 });
}

/** O infográfico guardado do resumo, ou `null` se ainda não foi gerado. */
export function getInfographic(id: string): Promise<LibraryInfographic | null> {
  return ipc.invoke(IpcChannels.library.infographic.get, { id });
}

/**
 * Pede à IA o infográfico do resumo (gera de novo se já havia um). Com `layout`, usa o modelo
 * escolhido; sem ele a IA escolhe o que melhor serve ao resumo.
 */
export function generateInfographic(
  id: string,
  options: { modelId?: string; layout?: InfographicLayoutId } = {},
): Promise<LibraryInfographic> {
  return ipc.invoke(IpcChannels.library.infographic.generate, { id, ...options });
}
