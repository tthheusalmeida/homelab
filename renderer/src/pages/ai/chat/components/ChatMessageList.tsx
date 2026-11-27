import { memo, useCallback, useEffect, useRef } from "react";

import type { ChatReference } from "#shared/contracts/chat";

import { STREAMING_MESSAGE_ID, type AiMessage, type ChatStatus } from "../types/chat";

import { ChatMessage } from "./ChatMessage";
import { LoadingState } from "#components/LoadingState";
import { useErrorAlert } from "#hooks/use-error-alert";

interface ChatMessageListProps {
  messages: AiMessage[];
  status?: ChatStatus;
  /** Falha do último envio (a mensagem volta ao campo para tentar de novo). */
  error?: string | null;
  /** Abre uma referência para consulta rápida. */
  onPreviewReference?: (reference: ChatReference) => void;
  /** Recebe a área que rola (o texto da conversa), para a pesquisa dentro do texto marcar as ocorrências. */
  onContainer?: (element: HTMLDivElement | null) => void;
}

export const ChatMessageList = memo(function ChatMessageList({
  messages,
  status = "idle",
  error = null,
  onContainer,
  onPreviewReference,
}: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useErrorAlert(error);

  // Ref estável: um novo a cada render entregaria `null` e o elemento de novo, e a tela redesenharia sem parar.
  const setScrollElement = useCallback(
    (element: HTMLDivElement | null) => {
      scrollRef.current = element;
      onContainer?.(element);
    },
    [onContainer],
  );

  // A resposta chegando aos pedaços: o "Pensando" sai assim que o primeiro texto aparece.
  const isStreaming = messages.at(-1)?.id === STREAMING_MESSAGE_ID;

  // Rola só esta lista até o fim (scrollIntoView também moveria a página e a barra de envio).
  useEffect(() => {
    const element = scrollRef.current;

    element?.scrollTo?.({ top: element.scrollHeight, behavior: isStreaming ? "auto" : "smooth" });
  }, [messages, status, error, isStreaming]);

  return (
    <div ref={setScrollElement} className="min-h-0 flex-1 overflow-y-auto">
      <div
        role="log"
        aria-label="Mensagens da conversa"
        className="mx-auto flex w-full max-w-4xl flex-col gap-3 px-4 py-2"
      >
        {messages.map((message) => (
          <div key={message.id} className="animate-enter">
            <ChatMessage message={message} onPreviewReference={onPreviewReference} />
          </div>
        ))}

        {status === "sending" && !isStreaming && (
          <div className="animate-enter-fade">
            <LoadingState message="Pensando" inline />
          </div>
        )}

        {status === "cancelled" && (
          <div className="animate-enter-fade">
            <LoadingState message="Geração cancelada" loading={false} inline />
          </div>
        )}

      </div>
    </div>
  );
});
