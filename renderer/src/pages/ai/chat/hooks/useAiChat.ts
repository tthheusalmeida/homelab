import { useRef, useState } from 'react';

import type { AiChatRequest, AiChatRequestMessage } from '../types/chat';

import { IpcChannels } from '#shared/channels';
import type { AiProviderId } from '#shared/contracts/ai';
import { ipc } from '#lib/ipc';

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
 * Envio por IPC (`chat:send`).
 * A API é a mesma: `sendMessage`, `abort` e `isSending`. Cancelar mostra "Geração cancelada" e
 * descarta a resposta; a requisição já enviada ao provider termina no main (e conta no Uso).
 */
export function useAiChat() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function sendMessage(data: AiChatRequest): Promise<AiChatRequestMessage> {
    abortControllerRef.current?.abort();

    const controller = new AbortController();

    abortControllerRef.current = controller;
    setIsSending(true);

    try {
      return await untilAborted(
        ipc.invoke(IpcChannels.chat.send, {
          message: data.message,
          modelId: data.modelId,
          providerId: data.providerId as AiProviderId,
          thinking: data.thinking,
        }),
        controller.signal,
      );
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
        setIsSending(false);
      }
    }
  }

  function abort() {
    abortControllerRef.current?.abort();
  }

  return {
    sendMessage,
    abort,
    isSending,
  };
}
