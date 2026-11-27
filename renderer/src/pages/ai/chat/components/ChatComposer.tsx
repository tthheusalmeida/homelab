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
  /** Seletores da IA, quando ficam junto do campo (o chat os põe no cabeçalho para ganhar altura). */
  settings?: React.ReactNode;
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
    <footer className="shrink-0 pt-2">
      <div className="mx-auto w-full max-w-4xl">
        <div className="relative rounded-xl border bg-card shadow-lg">
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Envie uma mensagem..."
            className="min-h-14 resize-none border-0 bg-transparent pr-12 shadow-none focus-visible:ring-0"
          />

          <HexButton
            className="absolute right-2.5 bottom-2.5 h-8 w-7"
            disabled={disabled}
            aria-label={isSending ? "Parar geração" : "Enviar mensagem"}
            onClick={onSend}
          >
            {isSending ? (
              <Pause className="size-3.5 fill-current" />
            ) : (
              <Send className="size-3.5" />
            )}
          </HexButton>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-4">
          {settings ? <div className="min-w-0">{settings}</div> : <span />}

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 text-xs text-muted-foreground">
            {contextHint && <span data-testid="context-hint">{contextHint}</span>}

            <span>Enter para enviar · Shift + Enter para nova linha</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
