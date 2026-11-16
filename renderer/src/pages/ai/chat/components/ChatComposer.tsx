import type { KeyboardEvent } from "react";

import { Pause, Send } from "lucide-react";

import { HexButton } from "#components/HexButton";
import { Textarea } from "#ui/textarea";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  isSending?: boolean;
  settings: React.ReactNode;
  /** Texto discreto sobre o tamanho do contexto (ex.: "~12 mil tokens no contexto (estimativa)"). */
  contextHint?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  disabled,
  isSending,
  settings,
  contextHint,
}: ChatComposerProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!isSending && !disabled) {
      onSend();
    }
  }

  return (
    <footer className="shrink-0 pt-3">
      <div className="mx-auto w-full max-w-3xl">
        <div className="relative rounded-xl border bg-card shadow-lg">
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Envie uma mensagem..."
            className="min-h-24 resize-none border-0 bg-transparent pr-14 shadow-none focus-visible:ring-0"
          />

          <HexButton
            className="absolute right-3 bottom-3"
            disabled={disabled}
            aria-label={isSending ? "Parar geração" : "Enviar mensagem"}
            onClick={onSend}
          >
            {isSending ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Send className="size-4 top-2" />
            )}
          </HexButton>
        </div>

        <div className="mt-2 flex items-center justify-between gap-4">
          <div className="min-w-0">{settings}</div>

          <div className="flex shrink-0 flex-col items-end text-xs text-muted-foreground">
            {contextHint && <span data-testid="context-hint">{contextHint}</span>}

            <span>Enter para enviar · Shift + Enter para nova linha</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
