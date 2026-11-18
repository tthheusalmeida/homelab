import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { IpcChannels } from "#shared/channels";
import { mockApi, ok } from "#test/api-mock";

import { LIBRARY_KEY } from "../../../library/hooks/useLibrary";
import {
  completedJobIds,
  hasNewCompletion,
  useRefreshLibraryOnJobDone,
} from "./useRefreshLibraryOnJobDone";

const job = (id: string, status: string) =>
  ({
    id,
    name: "video-to-summary",
    label: "L",
    status,
    createdAt: "2026-01-01T10:00:00.000Z",
    completedAt: "",
    steps: [],
  }) as never;

describe("completedJobIds", () => {
  it("when the list has jobs in several states, should keep only the completed ones", () => {
    const ids = completedJobIds([job("a", "completed"), job("b", "running"), job("c", "failed")]);

    expect([...ids]).toEqual(["a"]);
  });
});

describe("hasNewCompletion", () => {
  it("when this is the first look, should not count existing jobs as new", () => {
    expect(hasNewCompletion(null, new Set(["a"]))).toBe(false);
  });

  it("when a job completed since the last look, should report it", () => {
    expect(hasNewCompletion(new Set(["a"]), new Set(["a", "b"]))).toBe(true);
  });

  it("when nothing changed, should not report", () => {
    expect(hasNewCompletion(new Set(["a"]), new Set(["a"]))).toBe(false);
  });

  it("when jobs were only removed from the history, should not report", () => {
    expect(hasNewCompletion(new Set(["a", "b"]), new Set(["a"]))).toBe(false);
  });
});

describe("useRefreshLibraryOnJobDone", () => {
  function setup(initial: unknown[]) {
    let jobs = initial;
    mockApi({ [IpcChannels.jobs.list]: () => ok(jobs) });

    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const invalidate = vi.spyOn(client, "invalidateQueries");

    renderHook(() => useRefreshLibraryOnJobDone(), { wrapper });

    return {
      /** Espera a primeira lista chegar (a "primeira olhada"). */
      loaded: () => waitFor(() => expect(client.getQueryData(["jobs"])).toBeDefined()),
      invalidate,
      /** Troca a resposta da lista e força a consulta (o polling faz isso na tela). */
      async update(next: unknown[]) {
        jobs = next;
        await act(async () => {
          await client.invalidateQueries({ queryKey: ["jobs"] });
        });
      },
    };
  }

  const libraryCalls = (invalidate: ReturnType<typeof setup>["invalidate"]) =>
    invalidate.mock.calls.filter(
      ([filters]) => JSON.stringify((filters as { queryKey?: unknown })?.queryKey) === JSON.stringify(LIBRARY_KEY),
    );

  it("when the first list already has completed jobs, should not refresh the library", async () => {
    const { invalidate, loaded } = setup([job("a", "completed")]);

    await loaded();
    expect(libraryCalls(invalidate)).toHaveLength(0);
  });

  it("when a running job finishes, should refresh the library so the inbox count updates at once", async () => {
    const { invalidate, update, loaded } = setup([job("a", "running")]);
    await loaded();

    await update([job("a", "completed")]);

    await waitFor(() => expect(libraryCalls(invalidate)).toHaveLength(1));
  });

  it("when a job fails, should not refresh the library", async () => {
    const { invalidate, update, loaded } = setup([job("a", "running")]);
    await loaded();

    await update([job("a", "failed")]);

    expect(libraryCalls(invalidate)).toHaveLength(0);
  });

  it("when the same completed job is listed again, should refresh only once", async () => {
    const { invalidate, update, loaded } = setup([job("a", "running")]);
    await loaded();

    await update([job("a", "completed")]);
    await update([job("a", "completed")]);

    await waitFor(() => expect(libraryCalls(invalidate)).toHaveLength(1));
  });
});
