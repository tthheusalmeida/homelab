import { memo } from "react";

import type { ChatReference } from "#shared/contracts/chat";

import type { AiMessage } from "../types/chat";
import { HexDot } from "#components/Hex";
import { ChatReferences } from "./ChatReferences";
import { MarkdownMessage } from "#components/MarkdownMessage";
import { cn } from "#lib/utils";
import { ChatStrings } from "../strings";

interface ChatMessageProps {
  message: AiMessage;
  /** Abre uma referência da resposta para consulta rápida (sem sair da conversa). */
  onPreviewReference?: (reference: ChatReference) => void;
}

/**
 * Mensagem em estilo terminal: uma linha mono com quem fala (`você@homelab`, `assistente`) e o
 * texto numa caixa de borda fina. A do usuário vem à direita, na cor de destaque; a do assistente
 * ocupa a largura toda. Memoizado: o Markdown de uma resposta longa não é refeito a cada tecla do campo.
 */
export const ChatMessage = memo(function ChatMessage({
  message,
  onPreviewReference,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const references = message.references;

  return (
    <div className={cn("flex flex-col gap-1.5", isUser ? "items-end" : "items-start")}>
      <p className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
        <HexDot className={isUser ? "bg-primary" : "bg-emerald-500"} />
        {isUser ? (
          <span>
            você<span className="text-primary">@</span>homelab
          </span>
        ) : (
          <span>assistente</span>
        )}
      </p>

      <div
        className={cn(
          "rounded-lg border px-3.5 py-2.5 text-sm leading-6",
          isUser
            ? "max-w-[75%] border-primary/30 bg-primary/10 whitespace-pre-wrap"
            : "w-full bg-card",
        )}
      >
        {isUser ? message.content : <MarkdownMessage content={message.content} />}
      </div>

      {!isUser && references && <ChatReferences references={references} onPreview={onPreviewReference} />}

      {!isUser && message.searchedByWordsOnly && (
        <p className="max-w-prose font-mono text-[11px] text-muted-foreground">
          {ChatStrings.wordsOnlyNotice}
        </p>
      )}
    </div>
  );
});
