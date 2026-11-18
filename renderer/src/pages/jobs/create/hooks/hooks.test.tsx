import { describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";

vi.mock("../api/create", () => ({
  getJobTypes: vi.fn(),
  createVideoToTranscriptBatch: vi.fn(),
  createVideoToSummaryBatch: vi.fn(),
}));

import { createWrapper } from "../../../../test/utils";
import {
  createVideoToSummaryBatch,
  createVideoToTranscriptBatch,
  getJobTypes,
} from "../api/create";

import { useCreateVideoToSummary } from "./useCreateVideoToSummary";
import { useCreateVideoToTranscript } from "./useCreateVideoToTranscript";
import { useJobTypes } from "./useJobsTypes";

const summaryParams = {
  urls: ["http://x"],
  providerId: "p",
  modelId: "m",
  thinking: "off",
  detail: "detailed" as const,
};

describe("jobs create hooks", () => {
  it("when useJobTypes mounts, should fetch the job types", async () => {
    vi.mocked(getJobTypes).mockResolvedValue([
      { type: "t", label: "T", description: "d" },
    ]);

    const { result } = renderHook(() => useJobTypes(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it("when the transcript mutation runs, should create the batch of links", async () => {
    vi.mocked(createVideoToTranscriptBatch).mockResolvedValue({
      created: 2,
      failed: [],
    });
    const { result } = renderHook(() => useCreateVideoToTranscript(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ urls: ["http://x", "http://y"] });
    });

    expect(vi.mocked(createVideoToTranscriptBatch).mock.calls[0][0]).toEqual({
      urls: ["http://x", "http://y"],
    });
  });

  it("when the summary mutation runs, should create the batch of links", async () => {
    vi.mocked(createVideoToSummaryBatch).mockResolvedValue({
      created: 1,
      failed: [],
    });
    const { result } = renderHook(() => useCreateVideoToSummary(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync(summaryParams);
    });

    expect(vi.mocked(createVideoToSummaryBatch).mock.calls[0][0]).toEqual(
      summaryParams,
    );
  });

  it.each([
    [
      "transcript",
      () => useCreateVideoToTranscript(),
      createVideoToTranscriptBatch,
      { urls: ["http://x"] },
    ],
    [
      "summary",
      () => useCreateVideoToSummary(),
      createVideoToSummaryBatch,
      summaryParams,
    ],
  ])(
    "when the %s job is created, should refresh the jobs list right away",
    async (_name, useHook, api, params) => {
      vi.mocked(api).mockResolvedValue({ created: 1, failed: [] });
      const wrapper = createWrapper();
      const { result } = renderHook(
        () => ({ create: useHook(), client: useQueryClient() }),
        { wrapper },
      );
      const invalidate = vi.spyOn(result.current.client, "invalidateQueries");

      await act(async () => {
        await (result.current.create as { mutateAsync: (p: unknown) => Promise<unknown> }).mutateAsync(params);
      });

      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jobs"] });
    },
  );

  it("when only part of the batch is created, should still refresh the jobs list", async () => {
    vi.mocked(createVideoToTranscriptBatch).mockResolvedValue({
      created: 1,
      failed: ["http://y"],
    });
    const { result } = renderHook(
      () => ({ create: useCreateVideoToTranscript(), client: useQueryClient() }),
      { wrapper: createWrapper() },
    );
    const invalidate = vi.spyOn(result.current.client, "invalidateQueries");

    await act(async () => {
      await result.current.create.mutateAsync({ urls: ["http://x", "http://y"] });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["jobs"] });
  });
});
