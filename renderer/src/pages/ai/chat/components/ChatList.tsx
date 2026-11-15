import type { CSSProperties } from "react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";

import type { ChatSummary } from "#shared/contracts/chat";
import { Button } from "#ui/button";
import { Skeleton } from "#ui/skeleton";
import { cn } from "#lib/utils";

import { ChatStrings } from "../strings";

interface ChatListProps {
  chats: ChatSummary[] | undefined;
  isLoading: boolean;
  isError: boolean;
  activeId?: string;
  /** Enquanto uma resposta é gerada não dá para trocar de conversa. */
  disabled?: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (chat: ChatSummary) => void;
  onRetry: () => void;
}

/** Lista lateral de conversas, da mais recente para a mais antiga, com "Novo chat" no topo. */
export function ChatList({
  chats,
  isLoading,
  isError,
  activeId,
  disabled = false,
  onSelect,
  onNew,
  onDelete,
  onRetry,
}: ChatListProps) {
  return (
    <nav
      aria-label={ChatStrings.listLabel}
      className="flex w-60 shrink-0 flex-col gap-2 border-r pr-3"
    >
      <Button variant="outline" className="justify-start" disabled={disabled} onClick={onNew}>
        <Plus />
        {ChatStrings.newChat}
      </Button>

      {isLoading && (
        <div className="flex flex-col gap-2" aria-hidden>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {isError && (
        <div role="alert" className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>{ChatStrings.loadListError}</p>

          <Button variant="outline" size="sm" onClick={onRetry}>
            {ChatStrings.retry}
          </Button>
        </div>
      )}

      {chats && chats.length === 0 && (
        <p className="px-1 text-xs text-muted-foreground">{ChatStrings.emptyList}</p>
      )}

      <ul className="flex flex-col gap-1">
        {chats?.map((chat, index) => (
          <li key={chat.id} className="animate-enter" style={{ "--i": index } as CSSProperties}>
            <div
              className={cn(
                "group flex items-center gap-1 rounded-md transition-colors",
                chat.id === activeId ? "bg-primary/15" : "hover:bg-muted",
              )}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60"
                aria-current={chat.id === activeId ? "page" : undefined}
                disabled={disabled}
                title={disabled ? ChatStrings.busy : chat.title}
                onClick={() => onSelect(chat.id)}
              >
                <MessageSquare className="size-4 shrink-0 text-muted-foreground" />

                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{chat.title}</span>

                  <span className="block text-xs text-muted-foreground">
                    {ChatStrings.messages(chat.messageCount)}
                  </span>
                </span>
              </button>

              <button
                type="button"
                className="mr-1 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 disabled:cursor-not-allowed"
                aria-label={ChatStrings.deleteChat(chat.title)}
                disabled={disabled}
                onClick={() => onDelete(chat)}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </nav>
  );
}
