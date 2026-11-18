import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  archiveDocument,
  createArticle,
  discardDocument,
  getCategories,
  getDocument,
  getDocuments,
  getIndexStatus,
  getInbox,
  getTags,
  publishDocument,
  reindex,
  suggestClassification,
  updateDocument,
} from "../api/library";
import type {
  LibraryFilters,
  PublishInput,
  UpdateDocumentInput,
} from "../types/library.types";

export const LIBRARY_KEY = ["library"] as const;

export function useDocuments(
  filters: LibraryFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: [...LIBRARY_KEY, "documents", filters],
    queryFn: () => getDocuments(filters),
    enabled: options.enabled ?? true,
    // Mantém a lista anterior na tela enquanto a nova pesquisa carrega.
    placeholderData: keepPreviousData,
  });
}

export function useDocument(id?: string) {
  return useQuery({
    queryKey: [...LIBRARY_KEY, "document", id],
    queryFn: () => getDocument(id!),
    enabled: Boolean(id),
  });
}

export function useInbox() {
  return useQuery({
    queryKey: [...LIBRARY_KEY, "inbox"],
    queryFn: getInbox,
  });
}

/** Quantas páginas aguardam decisão na Classificação (o contador da barra lateral). Compartilha a consulta da tela. */
export function useInboxCount(): number {
  const { data } = useInbox();

  return data?.length ?? 0;
}

export function useCategories() {
  return useQuery({
    queryKey: [...LIBRARY_KEY, "categories"],
    queryFn: getCategories,
  });
}

export function useTags() {
  return useQuery({
    queryKey: [...LIBRARY_KEY, "tags"],
    queryFn: getTags,
  });
}

export function useIndexStatus() {
  return useQuery({
    queryKey: [...LIBRARY_KEY, "index"],
    queryFn: getIndexStatus,
  });
}

/** Toda alteração invalida tudo da biblioteca (listas, árvore, tags, entrada). */
function useInvalidateLibrary() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: LIBRARY_KEY });
}

export function usePublishDocument() {
  const invalidate = useInvalidateLibrary();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: PublishInput }) =>
      publishDocument(id, input),
    onSuccess: invalidate,
  });
}

export function useArchiveDocument() {
  const invalidate = useInvalidateLibrary();

  return useMutation({
    mutationFn: (id: string) => archiveDocument(id),
    onSuccess: invalidate,
  });
}

export function useDiscardDocument() {
  const invalidate = useInvalidateLibrary();

  return useMutation({
    mutationFn: (id: string) => discardDocument(id),
    onSuccess: invalidate,
  });
}

export function useCreateArticle() {
  const invalidate = useInvalidateLibrary();

  return useMutation({
    mutationFn: createArticle,
    onSuccess: invalidate,
  });
}

export function useReindex() {
  const invalidate = useInvalidateLibrary();

  return useMutation({
    mutationFn: reindex,
    onSuccess: invalidate,
  });
}

/** Só sugere; não altera nada na biblioteca, então não invalida cache. */
export function useSuggestClassification() {
  return useMutation({
    mutationFn: ({ id, modelId }: { id: string; modelId?: string }) =>
      suggestClassification(id, modelId),
  });
}

export function useUpdateDocument() {
  const invalidate = useInvalidateLibrary();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateDocumentInput }) =>
      updateDocument(id, input),
    onSuccess: invalidate,
  });
}
