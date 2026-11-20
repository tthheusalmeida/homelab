import type { ReactNode } from "react";

import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("../api/library", () => ({
  getDocuments: vi.fn(),
  getDocument: vi.fn(),
  getInbox: vi.fn(),
  getCategories: vi.fn(),
  getTags: vi.fn(),
  getIndexStatus: vi.fn(),
  reindex: vi.fn(),
  publishDocument: vi.fn(),
  archiveDocument: vi.fn(),
  discardDocument: vi.fn(),
  createArticle: vi.fn(),
  suggestClassification: vi.fn(),
  updateDocument: vi.fn(),
  getMindMap: vi.fn(),
  generateMindMap: vi.fn(),
  getInfographic: vi.fn(),
  generateInfographic: vi.fn(),
  deleteMindMap: vi.fn(),
  deleteInfographic: vi.fn(),
  saveInfographic: vi.fn(),
  saveMindMapImage: vi.fn(),
  saveMindMap: vi.fn(),
}));

import { createTestQueryClient } from "../../../test/utils";
import * as library from "../api/library";

import {
  useArchiveDocument,
  useCategories,
  useCreateArticle,
  useDeleteInfographic,
  useDeleteMindMap,
  useDiscardDocument,
  useDocument,
  useDocuments,
  useGenerateInfographic,
  useGenerateMindMap,
  useIndexStatus,
  useInbox,
  useInfographic,
  useMindMap,
  usePublishDocument,
  useReindex,
  useSaveInfographic,
  useSaveMindMap,
  useSaveMindMapImage,
  useSuggestClassification,
  useTags,
  useUpdateDocument,
} from "./useLibrary";

function setup() {
  const client = createTestQueryClient();
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { wrapper, invalidate };
}

describe("library query hooks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("when useDocuments mounts, should fetch with the filters", async () => {
    vi.mocked(library.getDocuments).mockResolvedValue([]);
    const { wrapper } = setup();

    const { result } = renderHook(
      () => useDocuments({ q: "x", category: ["A"] }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(library.getDocuments).toHaveBeenCalledWith({
      q: "x",
      category: ["A"],
    });
  });

  it("when the filters change, should fetch again with the new filters", async () => {
    vi.mocked(library.getDocuments).mockResolvedValue([]);
    const { wrapper } = setup();

    const { result, rerender } = renderHook(({ q }) => useDocuments({ q }), {
      wrapper,
      initialProps: { q: "a" },
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ q: "b" });

    await waitFor(() =>
      expect(library.getDocuments).toHaveBeenLastCalledWith({ q: "b" }),
    );
  });

  it("when useDocument has no id, should not fetch", () => {
    const { wrapper } = setup();

    renderHook(() => useDocument(undefined), { wrapper });

    expect(library.getDocument).not.toHaveBeenCalled();
  });

  it("when useDocument has an id, should fetch it", async () => {
    vi.mocked(library.getDocument).mockResolvedValue({
      meta: {} as never,
      content: "x",
    });
    const { wrapper } = setup();

    const { result } = renderHook(() => useDocument("id1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(library.getDocument).toHaveBeenCalledWith("id1");
  });

  it("when the simple query hooks mount, should call their api functions", async () => {
    vi.mocked(library.getInbox).mockResolvedValue([]);
    vi.mocked(library.getCategories).mockResolvedValue([]);
    vi.mocked(library.getTags).mockResolvedValue([]);
    vi.mocked(library.getIndexStatus).mockResolvedValue({
      total: 0,
      errors: [],
    });
    const { wrapper } = setup();

    renderHook(
      () => {
        useInbox();
        useCategories();
        useTags();
        useIndexStatus();
      },
      { wrapper },
    );

    await waitFor(() => {
      expect(library.getInbox).toHaveBeenCalled();
      expect(library.getCategories).toHaveBeenCalled();
      expect(library.getTags).toHaveBeenCalled();
      expect(library.getIndexStatus).toHaveBeenCalled();
    });
  });
});

describe("library mutation hooks", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("when publishing, should call the api and invalidate all library queries", async () => {
    vi.mocked(library.publishDocument).mockResolvedValue({
      meta: {} as never,
      content: "",
    });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => usePublishDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: "id1",
        input: { category: ["A"] },
      });
    });

    expect(library.publishDocument).toHaveBeenCalledWith("id1", {
      category: ["A"],
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["library"] });
  });

  it("when archiving, should call the api and invalidate", async () => {
    vi.mocked(library.archiveDocument).mockResolvedValue({
      meta: {} as never,
      content: "",
    });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useArchiveDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("id1");
    });

    expect(library.archiveDocument).toHaveBeenCalledWith("id1");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["library"] });
  });

  it("when discarding, should call the api and invalidate", async () => {
    vi.mocked(library.discardDocument).mockResolvedValue(undefined);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useDiscardDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("id1");
    });

    expect(library.discardDocument).toHaveBeenCalledWith("id1");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["library"] });
  });

  it("when creating an article, should call the api and invalidate", async () => {
    vi.mocked(library.createArticle).mockResolvedValue({
      meta: {} as never,
      content: "",
    });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useCreateArticle(), { wrapper });
    const input = { title: "T", category: ["A"], content: "c" };

    await act(async () => {
      await result.current.mutateAsync(input);
    });

    expect(vi.mocked(library.createArticle).mock.calls[0][0]).toEqual(input);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["library"] });
  });

  it("when reindexing, should call the api and invalidate", async () => {
    vi.mocked(library.reindex).mockResolvedValue({ indexed: 0, errors: [] });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useReindex(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync();
    });

    expect(library.reindex).toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["library"] });
  });

  it("when updating, should call the api and invalidate the library queries", async () => {
    vi.mocked(library.updateDocument).mockResolvedValue({
      meta: {} as never,
      content: "",
    });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useUpdateDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: "id1",
        input: { title: "T" },
      });
    });

    expect(library.updateDocument).toHaveBeenCalledWith("id1", { title: "T" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["library"] });
  });

  it("when suggesting, should call the api with id and model and not invalidate", async () => {
    const suggestion = {
      title: "T",
      category: ["A"],
      tags: [],
      model: "gemini-3.1-flash-lite",
    };
    vi.mocked(library.suggestClassification).mockResolvedValue(suggestion);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useSuggestClassification(), {
      wrapper,
    });

    let returned: unknown;

    await act(async () => {
      returned = await result.current.mutateAsync({
        id: "id1",
        modelId: "gemini-3.1-flash-lite",
      });
    });

    expect(library.suggestClassification).toHaveBeenCalledWith(
      "id1",
      "gemini-3.1-flash-lite",
    );
    expect(returned).toEqual(suggestion);
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("when a mutation fails, should not invalidate the queries", async () => {
    vi.mocked(library.archiveDocument).mockRejectedValue(new Error("x"));
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useArchiveDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("id1").catch(() => {});
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe("mind map hooks", () => {
  const map = { nodes: [], model: "m", createdAt: "d", stale: false, edited: false };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("when useMindMap mounts, should fetch the saved map of the page", async () => {
    vi.mocked(library.getMindMap).mockResolvedValue(map);
    const { wrapper } = setup();

    const { result } = renderHook(() => useMindMap("id1"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(library.getMindMap).toHaveBeenCalledWith("id1");
    expect(result.current.data).toEqual(map);
  });

  it("when useMindMap is disabled, should not fetch", () => {
    const { wrapper } = setup();

    renderHook(() => useMindMap("id1", { enabled: false }), { wrapper });

    expect(library.getMindMap).not.toHaveBeenCalled();
  });

  it("when the map is generated, should store it in the map query without invalidating the library", async () => {
    vi.mocked(library.generateMindMap).mockResolvedValue(map);
    vi.mocked(library.getMindMap).mockResolvedValue(null);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => ({ query: useMindMap("id1"), generate: useGenerateMindMap() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).toBeNull();

    await act(async () => {
      await result.current.generate.mutateAsync({ id: "id1" });
    });

    expect(library.generateMindMap).toHaveBeenCalledWith("id1", undefined);
    await waitFor(() => expect(result.current.query.data).toEqual(map));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("when generating fails, should expose the error and keep the query as it was", async () => {
    vi.mocked(library.generateMindMap).mockRejectedValue(new Error("falhou"));
    vi.mocked(library.getMindMap).mockResolvedValue(null);
    const { wrapper } = setup();
    const { result } = renderHook(() => ({ query: useMindMap("id1"), generate: useGenerateMindMap() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    await act(async () => {
      await result.current.generate.mutateAsync({ id: "id1" }).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.generate.error?.message).toBe("falhou"));
    expect(result.current.query.data).toBeNull();
  });
});

describe('useSaveMindMapImage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('when saving, should send the name and the PNG and not invalidate the library', async () => {
    vi.mocked(library.saveMindMapImage).mockResolvedValue({ saved: true, path: 'D:/m.png' });
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => useSaveMindMapImage(), { wrapper });

    let returned: unknown;

    await act(async () => {
      returned = await result.current.mutateAsync({ fileName: 'Mapa', dataBase64: 'UE5H' });
    });

    expect(library.saveMindMapImage).toHaveBeenCalledWith('Mapa', 'UE5H');
    expect(returned).toEqual({ saved: true, path: 'D:/m.png' });
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useSaveMindMap', () => {
  const edited = {
    subtitle: 'Novo',
    nodes: [{ label: 'Termo', children: [] }],
    model: 'm',
    createdAt: 'd',
    stale: false,
    edited: true,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('when saving, should send the id and the map, and put the result in the map query', async () => {
    vi.mocked(library.saveMindMap).mockResolvedValue(edited);
    vi.mocked(library.getMindMap).mockResolvedValue(null);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(() => ({ query: useMindMap('id1'), save: useSaveMindMap() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).toBeNull();

    await act(async () => {
      await result.current.save.mutateAsync({
        id: 'id1',
        subtitle: 'Novo',
        nodes: [{ label: 'Termo', children: [] }],
      });
    });

    expect(library.saveMindMap).toHaveBeenCalledWith('id1', {
      subtitle: 'Novo',
      nodes: [{ label: 'Termo', children: [] }],
    });
    await waitFor(() => expect(result.current.query.data).toEqual(edited));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('when saving fails, should expose the error and keep the query as it was', async () => {
    vi.mocked(library.saveMindMap).mockRejectedValue(new Error('falhou'));
    vi.mocked(library.getMindMap).mockResolvedValue(null);
    const { wrapper } = setup();
    const { result } = renderHook(() => ({ query: useMindMap('id1'), save: useSaveMindMap() }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    await act(async () => {
      await result.current.save.mutateAsync({ id: 'id1', nodes: [] }).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.save.error?.message).toBe('falhou'));
    expect(result.current.query.data).toBeNull();
  });
});

describe('useInfographic', () => {
  const infographic = {
    title: 'T',
    piece: '',
    sections: [],
    model: 'm',
    createdAt: 'd',
    stale: false,
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('when useInfographic mounts, should fetch the saved infographic of the page', async () => {
    vi.mocked(library.getInfographic).mockResolvedValue(infographic);
    const { wrapper } = setup();

    const { result } = renderHook(() => useInfographic('id1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(library.getInfographic).toHaveBeenCalledWith('id1');
    expect(result.current.data).toEqual(infographic);
  });

  it('when useInfographic is disabled, should not fetch', () => {
    const { wrapper } = setup();

    renderHook(() => useInfographic('id1', { enabled: false }), { wrapper });

    expect(library.getInfographic).not.toHaveBeenCalled();
  });

  it('when it is generated, should store it in the infographic query without invalidating the library', async () => {
    vi.mocked(library.generateInfographic).mockResolvedValue(infographic);
    vi.mocked(library.getInfographic).mockResolvedValue(null);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(
      () => ({ query: useInfographic('id1'), generate: useGenerateInfographic() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data).toBeNull();

    await act(async () => {
      await result.current.generate.mutateAsync({ id: 'id1', layout: 'funnel' });
    });

    expect(library.generateInfographic).toHaveBeenCalledWith('id1', {
      modelId: undefined,
      layout: 'funnel',
    });
    await waitFor(() => expect(result.current.query.data).toEqual(infographic));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('when generating fails, should expose the error and keep the query as it was', async () => {
    vi.mocked(library.generateInfographic).mockRejectedValue(new Error('falhou'));
    vi.mocked(library.getInfographic).mockResolvedValue(infographic);
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({ query: useInfographic('id1'), generate: useGenerateInfographic() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    await act(async () => {
      await result.current.generate.mutateAsync({ id: 'id1' }).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.generate.error?.message).toBe('falhou'));
    expect(result.current.query.data).toEqual(infographic);
  });
});

describe("delete generated content hooks", () => {
  const infographicSaved = { title: "T", piece: "", sections: [], model: "m", createdAt: "d", stale: false };

  it("when deleting the infographic, should put null in its query and refresh only the page list", async () => {
    vi.mocked(library.getInfographic).mockResolvedValue(infographicSaved as never);
    vi.mocked(library.deleteInfographic).mockResolvedValue(undefined);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(
      () => ({ query: useInfographic("id1"), remove: useDeleteInfographic() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.query.data).toEqual(infographicSaved));

    await act(async () => {
      await result.current.remove.mutateAsync("id1");
    });

    expect(library.deleteInfographic).toHaveBeenCalledWith("id1");
    await waitFor(() => expect(result.current.query.data).toBeNull());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["library", "documents"] });
  });

  it("when deleting the mind map, should put null in its query and refresh only the page list", async () => {
    vi.mocked(library.getMindMap).mockResolvedValue({ nodes: [] } as never);
    vi.mocked(library.deleteMindMap).mockResolvedValue(undefined);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(
      () => ({ query: useMindMap("id1"), remove: useDeleteMindMap() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.query.data).toEqual({ nodes: [] }));

    await act(async () => {
      await result.current.remove.mutateAsync("id1");
    });

    expect(library.deleteMindMap).toHaveBeenCalledWith("id1");
    await waitFor(() => expect(result.current.query.data).toBeNull());
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["library", "documents"] });
  });

  it("when deleting fails, should keep the saved content and expose the error", async () => {
    vi.mocked(library.getInfographic).mockResolvedValue(infographicSaved as never);
    vi.mocked(library.deleteInfographic).mockRejectedValue(new Error("Falha"));
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({ query: useInfographic("id1"), remove: useDeleteInfographic() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.query.data).toEqual(infographicSaved));

    await act(async () => {
      await result.current.remove.mutateAsync("id1").catch(() => undefined);
    });

    await waitFor(() => expect(result.current.remove.isError).toBe(true));
    expect(result.current.query.data).toEqual(infographicSaved);
  });
});

describe("save infographic hook", () => {
  const before = { title: "T", piece: "a.b", sections: [], model: "m", createdAt: "d", stale: false };

  it("when saving, should put the saved infographic in its query without refreshing the library", async () => {
    vi.mocked(library.getInfographic).mockResolvedValue(before as never);
    vi.mocked(library.saveInfographic).mockResolvedValue({ ...before, piece: "c.d", edited: true } as never);
    const { wrapper, invalidate } = setup();
    const { result } = renderHook(
      () => ({ query: useInfographic("id1"), save: useSaveInfographic() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.query.data).toEqual(before));

    await act(async () => {
      await result.current.save.mutateAsync({
        id: "id1",
        infographic: { title: "T", piece: "c.d", sections: [] },
      });
    });

    expect(library.saveInfographic).toHaveBeenCalledWith("id1", {
      title: "T",
      piece: "c.d",
      sections: [],
    });
    await waitFor(() => expect(result.current.query.data).toMatchObject({ piece: "c.d", edited: true }));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("when saving fails, should keep what was saved before and expose the error", async () => {
    vi.mocked(library.getInfographic).mockResolvedValue(before as never);
    vi.mocked(library.saveInfographic).mockRejectedValue(new Error("Falha"));
    const { wrapper } = setup();
    const { result } = renderHook(
      () => ({ query: useInfographic("id1"), save: useSaveInfographic() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.query.data).toEqual(before));

    await act(async () => {
      await result.current
        .save.mutateAsync({ id: "id1", infographic: { title: "T", piece: "c.d", sections: [] } })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.save.isError).toBe(true));
    expect(result.current.query.data).toEqual(before);
  });
});
