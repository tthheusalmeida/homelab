import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("../api/chat", () => ({
  getAiProviders: vi.fn(),
  getAiModels: vi.fn(),
  getAiThinkingOptions: vi.fn(),
}));

import { createWrapper } from "../../../../test/utils";
import { getAiModels, getAiProviders, getAiThinkingOptions } from "../api/chat";

import { useAiModels } from "./useAiModels";
import { useAiProviders } from "./useAiProviders";
import { useAiThinking } from "./useAiThinking";

describe("chat query hooks", () => {
  beforeEach(() => {
    vi.mocked(getAiProviders).mockReset();
    vi.mocked(getAiModels).mockReset();
    vi.mocked(getAiThinkingOptions).mockReset();
  });

  it("when useAiProviders mounts, should fetch providers", async () => {
    vi.mocked(getAiProviders).mockResolvedValue([
      { id: "ollama", label: "Ollama" },
    ]);

    const { result } = renderHook(() => useAiProviders(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "ollama", label: "Ollama" }]);
  });

  it("when useAiModels has no provider, should not fetch", () => {
    renderHook(() => useAiModels(undefined), { wrapper: createWrapper() });

    expect(getAiModels).not.toHaveBeenCalled();
  });

  it("when useAiModels has a provider, should fetch its models", async () => {
    vi.mocked(getAiModels).mockResolvedValue([]);

    const { result } = renderHook(() => useAiModels("gemini"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getAiModels).toHaveBeenCalledWith("gemini");
  });

  describe("model list freshness", () => {
    // Como o app: o cache é mantido e uma consulta vale por 30 s (o cliente de teste padrão a descarta).
    const keepingWrapper = () => {
      const client = new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: false } },
      });

      return ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      );
    };

    it("when the provider is Ollama, should check the list again on remount, since models are installed in another window", async () => {
      vi.mocked(getAiModels).mockResolvedValue([]);

      const wrapper = keepingWrapper();
      const first = renderHook(() => useAiModels("ollama"), { wrapper });

      await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
      first.unmount();
      renderHook(() => useAiModels("ollama"), { wrapper });

      await waitFor(() => expect(getAiModels).toHaveBeenCalledTimes(2));
    });

    it("when the provider is a cloud one, should reuse the list it already has", async () => {
      vi.mocked(getAiModels).mockResolvedValue([]);

      const wrapper = keepingWrapper();
      const first = renderHook(() => useAiModels("gemini"), { wrapper });

      await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
      first.unmount();

      const second = renderHook(() => useAiModels("gemini"), { wrapper });

      await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
      expect(getAiModels).toHaveBeenCalledTimes(1);
    });
  });

  it("when useAiThinking lacks provider or model, should not fetch", () => {
    renderHook(() => useAiThinking({ providerId: "ollama" }), {
      wrapper: createWrapper(),
    });
    renderHook(() => useAiThinking({ modelId: "m" }), {
      wrapper: createWrapper(),
    });

    expect(getAiThinkingOptions).not.toHaveBeenCalled();
  });

  it("when useAiThinking has provider and model, should fetch the options", async () => {
    vi.mocked(getAiThinkingOptions).mockResolvedValue([]);

    const { result } = renderHook(
      () => useAiThinking({ providerId: "ollama", modelId: "m" }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getAiThinkingOptions).toHaveBeenCalledWith("ollama", "m");
  });
});
