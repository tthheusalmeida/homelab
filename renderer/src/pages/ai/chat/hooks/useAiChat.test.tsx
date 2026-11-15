import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok, payloadsOf } from '#test/api-mock';

import { chatKeys } from './useChats';
import { useAiChat } from './useAiChat';

const request = {
  chatId: 'c1',
  providerId: 'ollama',
  modelId: 'm',
  thinking: 'off',
  message: 'oi',
};

const chat = {
  id: 'c1',
  title: 'oi',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  providerId: 'ollama',
  modelId: 'm',
  messageCount: 2,
  messages: [],
};

function setup() {
  // gcTime infinito: o teste lê o cache depois que ninguém mais o observa
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  return { client, wrapper };
}

/** `chat:send` que só responde quando o teste mandar (para simular uma requisição pendente). */
function pendingChat(extra: Record<string, () => unknown> = {}) {
  let answer!: (value: unknown) => void;
  const invoke = mockApi({
    [IpcChannels.chat.send]: () => new Promise((resolve) => (answer = resolve)),
    [IpcChannels.chat.cancel]: () => ok(undefined),
    ...extra,
  });

  return { invoke, answer: (value: unknown) => answer(value) };
}

describe('useAiChat', () => {
  it('when initialized, should not be sending', () => {
    mockApi({});
    const { wrapper } = setup();

    const { result } = renderHook(() => useAiChat(), { wrapper });

    expect(result.current.isSending).toBe(false);
  });

  it('when a message is sent, should invoke chat:send with the chat id and body and return the message and chat', async () => {
    const invoke = mockApi({
      [IpcChannels.chat.send]: () => ok({ message: 'resposta', chat }),
    });
    const { wrapper } = setup();
    const { result } = renderHook(() => useAiChat(), { wrapper });

    let response;
    await act(async () => {
      response = await result.current.sendMessage(request);
    });

    expect(response).toEqual({ message: 'resposta', chat });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.chat.send, {
      chatId: 'c1',
      providerId: 'ollama',
      modelId: 'm',
      thinking: 'off',
      message: 'oi',
    });
  });

  it('when the answer arrives, should store the chat in the cache and refresh the chat list', async () => {
    mockApi({ [IpcChannels.chat.send]: () => ok({ message: 'resposta', chat }) });
    const { client, wrapper } = setup();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useAiChat(), { wrapper });

    await act(async () => {
      await result.current.sendMessage(request);
    });

    expect(client.getQueryData(chatKeys.detail('c1'))).toEqual(chat);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: chatKeys.list });
  });

  it('when the request is in flight, should be sending and then stop after it resolves', async () => {
    const pending = pendingChat();
    const { wrapper } = setup();
    const { result } = renderHook(() => useAiChat(), { wrapper });

    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.sendMessage(request);
    });
    expect(result.current.isSending).toBe(true);

    await act(async () => {
      pending.answer(ok({ message: 'x', chat }));
      await promise;
    });
    expect(result.current.isSending).toBe(false);
  });

  it('when the provider fails, should rethrow the message, stop sending and leave the cache alone', async () => {
    mockApi({
      [IpcChannels.chat.send]: () =>
        failure('PROVIDER_FAILED', 'A requisição para o chat do Ollama falhou.'),
    });
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useAiChat(), { wrapper });

    await act(async () => {
      await expect(result.current.sendMessage(request)).rejects.toThrow(
        'A requisição para o chat do Ollama falhou.',
      );
    });

    expect(result.current.isSending).toBe(false);
    expect(client.getQueryData(chatKeys.detail('c1'))).toBeUndefined();
  });

  it('when abort is called, should reject with an AbortError, stop sending and tell the main to discard the answer', async () => {
    const pending = pendingChat();
    const { wrapper } = setup();
    const { result } = renderHook(() => useAiChat(), { wrapper });

    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.sendMessage(request);
    });

    await act(async () => {
      result.current.abort();
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    });

    expect(result.current.isSending).toBe(false);
    expect(payloadsOf(pending.invoke, IpcChannels.chat.cancel)).toEqual([{ chatId: 'c1' }]);
  });

  it('when telling the main to cancel fails, should still release the screen without throwing', async () => {
    pendingChat({ [IpcChannels.chat.cancel]: () => failure('INTERNAL', 'sem main') });
    const { wrapper } = setup();
    const { result } = renderHook(() => useAiChat(), { wrapper });

    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.sendMessage(request);
    });

    await act(async () => {
      expect(() => result.current.abort()).not.toThrow();
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    });

    expect(result.current.isSending).toBe(false);
  });

  it('when abort is called with nothing being sent, should not call chat:cancel', () => {
    const invoke = mockApi({ [IpcChannels.chat.cancel]: () => ok(undefined) });
    const { wrapper } = setup();
    const { result } = renderHook(() => useAiChat(), { wrapper });

    act(() => result.current.abort());

    expect(payloadsOf(invoke, IpcChannels.chat.cancel)).toEqual([]);
  });

  it('when the answer arrives after abort, should keep the AbortError and not touch the cache', async () => {
    const pending = pendingChat();
    const { client, wrapper } = setup();
    const { result } = renderHook(() => useAiChat(), { wrapper });

    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.sendMessage(request);
    });

    await act(async () => {
      result.current.abort();
      await promise.catch(() => undefined);
      pending.answer(ok({ message: 'tarde demais', chat }));
    });

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(client.getQueryData(chatKeys.detail('c1'))).toBeUndefined();
  });

  it('when a new message is sent while another is pending, should abort the previous one', async () => {
    mockApi({ [IpcChannels.chat.send]: () => new Promise(() => {}) });
    const { wrapper } = setup();
    const { result } = renderHook(() => useAiChat(), { wrapper });

    let first!: Promise<unknown>;
    act(() => {
      first = result.current.sendMessage(request);
      void result.current.sendMessage(request).catch(() => undefined);
    });

    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(result.current.isSending).toBe(true);
  });
});
