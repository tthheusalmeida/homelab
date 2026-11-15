import { useEffect, useRef } from "react";

import type { AiMessage, ChatStatus } from "../types/chat";

import { ChatMessage } from "./ChatMessage";
import { LoadingState } from "#components/LoadingState";
import { ScrollArea } from "#ui/scroll-area";

interface ChatMessageListProps {
  messages: AiMessage[];
  status?: ChatStatus;
  /** Falha do último envio (a mensagem volta ao campo para tentar de novo). */
  error?: string | null;
}

export function ChatMessageList({
  messages,
  status = "idle",
  error = null,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, status, error]);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div
        role="log"
        aria-label="Mensagens da conversa"
        className="mx-auto flex w-full flex-col gap-4 px-4 py-4"
      >
        {messages.map((message) => (
          <div key={message.id} className="animate-enter">
            <ChatMessage message={message} />
          </div>
        ))}

        {status === "sending" && (
          <div className="animate-enter-fade">
            <LoadingState message="Pensando" inline />
          </div>
        )}

        {status === "cancelled" && (
          <div className="animate-enter-fade">
            <LoadingState message="Geração cancelada" loading={false} inline />
          </div>
        )}

        {error && (
          <p role="alert" className="animate-enter-fade text-sm text-destructive">
            {error}
          </p>
        )}

        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
