import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import { useAiChat } from './useAiChat';

const request = { providerId: 'ollama', modelId: 'm', thinking: 'off', message: 'oi' };

/** `chat:send` que só responde quando o teste mandar (para simular uma requisição pendente). */
function pendingChat() {
  let answer!: (value: unknown) => void;
  const invoke = mockApi({
    [IpcChannels.chat.send]: () => new Promise((resolve) => (answer = resolve)),
  });

  return { invoke, answer: (value: unknown) => answer(value) };
}

describe('useAiChat', () => {
  it('when initialized, should not be sending', () => {
    mockApi({});

    const { result } = renderHook(() => useAiChat());

    expect(result.current.isSending).toBe(false);
  });

  it('when a message is sent, should invoke chat:send with the body and return the message', async () => {
    const invoke = mockApi({ [IpcChannels.chat.send]: () => ok({ message: 'resposta' }) });
    const { result } = renderHook(() => useAiChat());

    let response;
    await act(async () => {
      response = await result.current.sendMessage(request);
    });

    expect(response).toEqual({ message: 'resposta' });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.chat.send, request);
  });

  it('when the request is in flight, should be sending and then stop after it resolves', async () => {
    const chat = pendingChat();
    const { result } = renderHook(() => useAiChat());

    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.sendMessage(request);
    });
    expect(result.current.isSending).toBe(true);

    await act(async () => {
      chat.answer(ok({ message: 'x' }));
      await promise;
    });
    expect(result.current.isSending).toBe(false);
  });

  it('when the provider fails, should rethrow the message and stop sending', async () => {
    mockApi({
      [IpcChannels.chat.send]: () =>
        failure('PROVIDER_FAILED', 'A requisição para o chat do Ollama falhou.'),
    });
    const { result } = renderHook(() => useAiChat());

    await act(async () => {
      await expect(result.current.sendMessage(request)).rejects.toThrow(
        'A requisição para o chat do Ollama falhou.',
      );
    });
    expect(result.current.isSending).toBe(false);
  });

  it('when abort is called, should reject with an AbortError and stop sending', async () => {
    pendingChat();
    const { result } = renderHook(() => useAiChat());

    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.sendMessage(request);
    });

    await act(async () => {
      result.current.abort();
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    });

    expect(result.current.isSending).toBe(false);
  });

  it('when the answer arrives after abort, should keep the AbortError and not throw again', async () => {
    const chat = pendingChat();
    const { result } = renderHook(() => useAiChat());

    let promise!: Promise<unknown>;
    act(() => {
      promise = result.current.sendMessage(request);
    });

    await act(async () => {
      result.current.abort();
      await promise.catch(() => undefined);
      chat.answer(ok({ message: 'tarde demais' }));
    });

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('when a new message is sent while another is pending, should abort the previous one', async () => {
    mockApi({ [IpcChannels.chat.send]: () => new Promise(() => {}) });
    const { result } = renderHook(() => useAiChat());

    let first!: Promise<unknown>;
    act(() => {
      first = result.current.sendMessage(request);
      void result.current.sendMessage(request).catch(() => undefined);
    });

    await expect(first).rejects.toMatchObject({ name: 'AbortError' });
    expect(result.current.isSending).toBe(true);
  });
});
