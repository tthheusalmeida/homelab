import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";

import { IpcChannels } from "#shared/channels";
import { failure, mockApi, ok, payloadsOf } from "#test/api-mock";

import { chatKeys, useChat, useChats, useDeleteChat } from "./useChats";

function setup() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { client, wrapper };
}

describe("chat hooks", () => {
  it("when useChats mounts, should load the saved chats", async () => {
    mockApi({ [IpcChannels.chats.list]: () => ok([{ id: "a", title: "A" }]) });
    const { wrapper } = setup();

    const { result } = renderHook(() => useChats(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "a", title: "A" }]);
  });

  it("when useChat has no id (a chat that does not exist yet), should not fetch anything", () => {
    const invoke = mockApi({});
    const { wrapper } = setup();

    renderHook(() => useChat(undefined), { wrapper });

    expect(invoke).not.toHaveBeenCalled();
  });

  it("when useChat has an id, should fetch that chat", async () => {
    const invoke = mockApi({
      [IpcChannels.chats.get]: () => ok({ id: "a", messages: [] }),
    });
    const { wrapper } = setup();

    const { result } = renderHook(() => useChat("a"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(payloadsOf(invoke, IpcChannels.chats.get)).toEqual([{ id: "a" }]);
  });

  it("when the chat does not exist, should fail once without retrying", async () => {
    const invoke = mockApi({
      [IpcChannels.chats.get]: () => failure("NOT_FOUND", "Chat não encontrado."),
    });
    const { wrapper } = setup();

    const { result } = renderHook(() => useChat("sumiu"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(payloadsOf(invoke, IpcChannels.chats.get)).toHaveLength(1);
  });

  it("when a chat is deleted, should call the channel, drop its cached detail and refresh the list", async () => {
    const invoke = mockApi({ [IpcChannels.chats.delete]: () => ok(undefined) });
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, "invalidateQueries");

    client.setQueryData(chatKeys.detail("a"), { id: "a" });
    client.setQueryData(chatKeys.detail("b"), { id: "b" });

    const { result } = renderHook(() => useDeleteChat(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync("a");
    });

    expect(payloadsOf(invoke, IpcChannels.chats.delete)).toEqual([{ id: "a" }]);
    expect(client.getQueryData(chatKeys.detail("a"))).toBeUndefined();
    expect(client.getQueryData(chatKeys.detail("b"))).toEqual({ id: "b" });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: chatKeys.list });
  });

  it("when deleting fails, should keep the cached chat and surface the error", async () => {
    mockApi({
      [IpcChannels.chats.delete]: () => failure("PERSIST_FAILED", "Não foi possível gravar."),
    });
    const { client, wrapper } = setup();

    client.setQueryData(chatKeys.detail("a"), { id: "a" });

    const { result } = renderHook(() => useDeleteChat(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync("a")).rejects.toThrow("Não foi possível gravar.");
    });

    expect(client.getQueryData(chatKeys.detail("a"))).toEqual({ id: "a" });
  });
});
