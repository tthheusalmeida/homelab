import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  archiveDocument,
  createArticle,
  createCategory,
  deleteCategory,
  discardDocument,
  getCategories,
  getDocument,
  getDocuments,
  getIndexStatus,
  deleteInfographic,
  deleteMindMap,
  generateInfographic,
  generateMindMap,
  getInbox,
  getInfographic,
  getMindMap,
  getTags,
  publishDocument,
  reindex,
  renameCategory,
  saveInfographic,
  saveMindMap,
  saveMindMapImage,
  suggestClassification,
  updateDocument,
} from "../api/library";
import type {
  LibraryFilters,
  PublishInput,
  UpdateDocumentInput,
} from "../types/library.types";

import type { LibraryImageFormat, LibraryInfographicInput } from "#shared/contracts/library";
import type { InfographicLayoutId } from "#shared/infographic-layouts";

export const LIBRARY_KEY = ["library"] as const;

/** Um nó do mapa como vai para o main (termo, frase curta e filhos). */
type MindMapNodeInput = {
  label: string;
  note?: string;
  children: MindMapNodeInput[];
};

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

/** O mapa mental guardado de um resumo (`null` enquanto não foi gerado). */
export function useMindMap(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...LIBRARY_KEY, "mind-map", id],
    queryFn: () => getMindMap(id),
    enabled: options.enabled ?? true,
  });
}

/**
 * Gera o mapa mental com a IA. Guarda o resultado direto na consulta do mapa (não invalida a
 * biblioteca toda); isso vale mesmo se a aba do mapa for fechada antes de a IA responder.
 */
export function useGenerateMindMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, modelId }: { id: string; modelId?: string }) =>
      generateMindMap(id, modelId),
    onSuccess: async (map, { id }) => {
      queryClient.setQueryData([...LIBRARY_KEY, "mind-map", id], map);
      // a lista de Páginas mostra a marca de "tem mapa mental"
      await queryClient.invalidateQueries({ queryKey: [...LIBRARY_KEY, "documents"] });
    },
  });
}

/**
 * Guarda o mapa editado e o põe direto na consulta do mapa (não invalida a biblioteca toda), então a
 * tela já mostra o que foi salvo.
 */
export function useSaveMindMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      subtitle,
      nodes,
    }: {
      id: string;
      subtitle?: string;
      nodes: MindMapNodeInput[];
    }) => saveMindMap(id, { subtitle, nodes }),
    onSuccess: async (map, { id }) => {
      queryClient.setQueryData([...LIBRARY_KEY, "mind-map", id], map);
      // um mapa feito do zero também ganha a marca na lista de Páginas
      await queryClient.invalidateQueries({ queryKey: [...LIBRARY_KEY, "documents"] });
    },
  });
}

/**
 * Apaga só o mapa mental do resumo. Põe `null` direto na consulta do mapa (o resumo e o infográfico
 * não mudam, então a biblioteca não é invalidada), e a lista de Páginas refaz o filtro "Com mapa mental".
 */
export function useDeleteMindMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteMindMap(id),
    onSuccess: async (_result, id) => {
      queryClient.setQueryData([...LIBRARY_KEY, "mind-map", id], null);
      await queryClient.invalidateQueries({ queryKey: [...LIBRARY_KEY, "documents"] });
    },
  });
}

/**
 * Guarda o infográfico editado e o põe direto na consulta (não invalida a biblioteca toda), então a
 * tela já mostra o que foi salvo.
 */
export function useSaveInfographic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, infographic }: { id: string; infographic: LibraryInfographicInput }) =>
      saveInfographic(id, infographic),
    onSuccess: (infographic, { id }) =>
      queryClient.setQueryData([...LIBRARY_KEY, "infographic", id], infographic),
  });
}

/** Apaga só o infográfico do resumo. Igual ao do mapa mental, para o infográfico. */
export function useDeleteInfographic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteInfographic(id),
    onSuccess: async (_result, id) => {
      queryClient.setQueryData([...LIBRARY_KEY, "infographic", id], null);
      await queryClient.invalidateQueries({ queryKey: [...LIBRARY_KEY, "documents"] });
    },
  });
}

/** O infográfico guardado de um resumo (`null` enquanto não foi gerado). */
export function useInfographic(id: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: [...LIBRARY_KEY, "infographic", id],
    queryFn: () => getInfographic(id),
    enabled: options.enabled ?? true,
  });
}

/**
 * Gera o infográfico com a IA. Guarda o resultado direto na consulta do infográfico (não invalida a
 * biblioteca toda); isso vale mesmo se a aba for fechada antes de a IA responder.
 */
export function useGenerateInfographic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      modelId,
      layout,
    }: {
      id: string;
      modelId?: string;
      layout?: InfographicLayoutId;
    }) => generateInfographic(id, { modelId, layout }),
    onSuccess: async (infographic, { id }) => {
      queryClient.setQueryData([...LIBRARY_KEY, "infographic", id], infographic);
      // a lista de Páginas mostra a marca de "tem infográfico"
      await queryClient.invalidateQueries({ queryKey: [...LIBRARY_KEY, "documents"] });
    },
  });
}

/** Salva a imagem PNG do mapa onde o usuário escolher; não mexe na biblioteca, então não invalida nada. */
export function useSaveMindMapImage() {
  return useMutation({
    mutationFn: ({
      fileName,
      dataBase64,
      format,
    }: {
      fileName: string;
      dataBase64: string;
      format?: LibraryImageFormat;
    }) => saveMindMapImage(fileName, dataBase64, format),
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

/** Cria uma categoria vazia (e os níveis que faltarem); a árvore é lida de novo. */
export function useCreateCategory() {
  const invalidate = useInvalidateLibrary();

  return useMutation({
    mutationFn: (path: string[]) => createCategory(path),
    onSuccess: invalidate,
  });
}

/** Exclui uma categoria sem páginas; a árvore é lida de novo. */
export function useDeleteCategory() {
  const invalidate = useInvalidateLibrary();

  return useMutation({
    mutationFn: (path: string[]) => deleteCategory(path),
    onSuccess: invalidate,
  });
}

/** Renomeia ou move uma categoria; as páginas, a árvore e as tags são lidas de novo. */
export function useRenameCategory() {
  const invalidate = useInvalidateLibrary();

  return useMutation({
    mutationFn: ({ from, to }: { from: string[]; to: string[] }) =>
      renameCategory(from, to),
    onSuccess: invalidate,
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
