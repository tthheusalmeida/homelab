import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";

import { IpcChannels } from "#shared/channels";
import { failure, mockApi, ok } from "#test/api-mock";

import { createWrapper } from "../../../../test/utils";
import { useActiveJobsCount } from "./useActiveJobsCount";

const job = (id: string, status: string) => ({
  id,
  name: "n",
  label: "L",
  status,
  createdAt: "2026-01-01T10:00:00.000Z",
  completedAt: "",
  steps: [],
});

describe("useActiveJobsCount", () => {
  it("when jobs are pending or running, should count only those", async () => {
    mockApi({
      [IpcChannels.jobs.list]: () =>
        ok([job("1", "pending"), job("2", "running"), job("3", "completed"), job("4", "failed")]),
    });

    const { result } = renderHook(() => useActiveJobsCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current).toBe(2));
  });

  it("when nothing was loaded yet, should be zero", () => {
    mockApi({ [IpcChannels.jobs.list]: () => new Promise(() => undefined) });

    const { result } = renderHook(() => useActiveJobsCount(), { wrapper: createWrapper() });

    expect(result.current).toBe(0);
  });

  it("when loading fails, should be zero instead of throwing", async () => {
    const invoke = mockApi({ [IpcChannels.jobs.list]: () => failure("INTERNAL", "sem main") });

    const { result } = renderHook(() => useActiveJobsCount(), { wrapper: createWrapper() });

    await waitFor(() => expect(invoke).toHaveBeenCalled());
    expect(result.current).toBe(0);
  });

  it("when only the progress of a running job changes, should not render again", async () => {
    const running = (progress: number) => ({ ...job("1", "running"), progress });
    let current = running(10);

    mockApi({ [IpcChannels.jobs.list]: () => ok([current]) });

    let renders = 0;
    const { result } = renderHook(
      () => {
        renders += 1;

        return { count: useActiveJobsCount(), client: useQueryClient() };
      },
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.count).toBe(1));
    const before = renders;

    current = running(60);
    await act(async () => {
      await result.current.client.refetchQueries({ queryKey: ["jobs"] });
    });

    expect(renders).toBe(before);
  });
});
