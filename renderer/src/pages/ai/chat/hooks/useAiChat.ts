import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import type { AiChatRequest } from '../types/chat';
import { cancelChatMessage, sendChatMessage } from '../api/chat';
import { chatKeys } from './useChats';

import type { AiProviderId } from '#shared/contracts/ai';
import type { ChatSendResponse } from '#shared/contracts/chat';

/** Mesmo erro que o `fetch` lança ao abortar: a `ChatPage` testa `DOMException` + `AbortError`. */
function abortError(): DOMException {
  return new DOMException('The operation was aborted.', 'AbortError');
}

/** Rejeita com `AbortError` quando o sinal dispara; o IPC não é cancelável, então só se ignora a resposta. */
function untilAborted<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(abortError());
    }

    signal.addEventListener('abort', () => reject(abortError()), { once: true });
    work.then(resolve, reject);
  });
}

/**
 * Envio por IPC (`chat:send`), com o histórico no main. Ao responder, atualiza o chat e a lista de
 * conversas. Cancelar mostra "Geração cancelada", avisa o main (`chat:cancel`) para **descartar** a
 * resposta quando chegar (nada é gravado) e libera a tela; a chamada ao provedor termina no main e
 * conta no Uso.
 */
export function useAiChat() {
  const queryClient = useQueryClient();
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeChatRef = useRef<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function sendMessage(data: AiChatRequest): Promise<ChatSendResponse> {
    abortControllerRef.current?.abort();

    const controller = new AbortController();

    abortControllerRef.current = controller;
    activeChatRef.current = data.chatId;
    setIsSending(true);

    try {
      const response = await untilAborted(
        sendChatMessage({
          chatId: data.chatId,
          message: data.message,
          modelId: data.modelId,
          providerId: data.providerId as AiProviderId,
          thinking: data.thinking,
        }),
        controller.signal,
      );

      queryClient.setQueryData(chatKeys.detail(response.chat.id), response.chat);
      void queryClient.invalidateQueries({ queryKey: chatKeys.list });

      return response;
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsSending(false);
      }
    }
  }

  function abort() {
    const chatId = activeChatRef.current;

    abortControllerRef.current?.abort();

    if (chatId) {
      // Melhor esforço: se falhar, a resposta só aparece na próxima vez que o chat for aberto.
      void cancelChatMessage(chatId).catch(() => undefined);
    }
  }

  return {
    sendMessage,
    abort,
    isSending,
  };
}
