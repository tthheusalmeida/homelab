import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useAiSelection } from "./useAiSelection";

const providers = [{ id: "p1", label: "P1" }, { id: "p2", label: "P2" }];
const modelsOf: Record<string, { id: string; label: string }[]> = {
  p1: [{ id: "m1", label: "M1" }, { id: "m2", label: "M2" }],
  p2: [{ id: "m3", label: "M3" }],
};
const thinkingOf: Record<string, { id: string; label: string }[]> = {
  m1: [{ id: "t1", label: "T1" }],
  m2: [{ id: "t2", label: "T2" }],
  m3: [{ id: "t3", label: "T3" }],
};

vi.mock("./useAiProviders", () => ({
  useAiProviders: () => ({ data: providers, isLoading: false }),
}));
vi.mock("./useAiModels", () => ({
  useAiModels: (providerId?: string) => ({
    data: providerId ? modelsOf[providerId] : undefined,
    isLoading: false,
  }),
}));
vi.mock("./useAiThinking", () => ({
  useAiThinking: ({ modelId }: { modelId?: string }) => ({
    data: modelId ? thinkingOf[modelId] : undefined,
    isLoading: false,
  }),
}));

describe("useAiSelection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("when nothing is chosen and pickFirst is off, should leave the three empty", () => {
    const { result } = renderHook(() => useAiSelection());

    expect(result.current.providerId).toBeUndefined();
    expect(result.current.modelId).toBeUndefined();
    expect(result.current.thinkingId).toBeUndefined();
  });

  it("when pickFirst is on, should assume the first provider, model and thinking", () => {
    const { result } = renderHook(() => useAiSelection({ pickFirst: true }));

    expect([result.current.providerId, result.current.modelId, result.current.thinkingId]).toEqual([
      "p1",
      "m1",
      "t1",
    ]);
  });

  it("when there is a last use, should prefer it over the first of the list", () => {
    const { result } = renderHook(() =>
      useAiSelection({ pickFirst: true, last: { providerId: "p1", modelId: "m2", thinking: "t2" } }),
    );

    expect([result.current.providerId, result.current.modelId, result.current.thinkingId]).toEqual([
      "p1",
      "m2",
      "t2",
    ]);
  });

  it("when the provider changes, should clear the model and the thinking chosen before", () => {
    const { result } = renderHook(() => useAiSelection());

    act(() => result.current.onProviderChange("p1"));
    act(() => result.current.onModelChange("m2"));
    act(() => result.current.onThinkingChange("t2"));

    expect(result.current.thinkingId).toBe("t2");

    act(() => result.current.onProviderChange("p2"));

    expect(result.current.providerId).toBe("p2");
    expect(result.current.modelId).toBeUndefined();
    expect(result.current.thinkingId).toBeUndefined();
  });

  it("when the model changes, should clear only the thinking", () => {
    const { result } = renderHook(() => useAiSelection());

    act(() => result.current.onProviderChange("p1"));
    act(() => result.current.onModelChange("m1"));
    act(() => result.current.onThinkingChange("t1"));
    act(() => result.current.onModelChange("m2"));

    expect(result.current.providerId).toBe("p1");
    expect(result.current.modelId).toBe("m2");
    expect(result.current.thinkingId).toBeUndefined();
  });

  it("when reset is called, should drop every manual choice", () => {
    const { result } = renderHook(() => useAiSelection());

    act(() => result.current.onProviderChange("p2"));
    act(() => result.current.reset());

    expect(result.current.providerId).toBeUndefined();
  });

  it("when a model is active, should expose it as activeModel", () => {
    const { result } = renderHook(() => useAiSelection({ pickFirst: true }));

    expect(result.current.activeModel).toEqual({ id: "m1", label: "M1" });
  });
});
