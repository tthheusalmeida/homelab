import type { KeyboardEvent } from "react";

import { ArrowUp, Square } from "lucide-react";

import { HexButton } from "#components/HexButton";
import { cn } from "#lib/utils";
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
        {/* O campo cresce com as linhas (até 40% da altura da janela, depois rola) e o botão fica alinhado embaixo, ao lado dele. */}
        <div className="flex items-end gap-2 rounded-xl border bg-card p-1.5 shadow-lg">
          <Textarea
            rows={1}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Envie uma mensagem..."
            className="max-h-[40dvh] min-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent shadow-none dark:bg-transparent focus-visible:ring-0"
          />

          <HexButton
            className={cn("mb-0.5 h-9 w-8 shrink-0", isSending && "animate-pulse")}
            disabled={disabled}
            aria-label={isSending ? "Parar geração" : "Enviar mensagem"}
            onClick={onSend}
          >
            {/* Como no Claude: seta para cima para enviar e um quadradinho cheio para parar. */}
            {isSending ? (
              <Square className="size-3 fill-current" />
            ) : (
              <ArrowUp className="size-4.5" strokeWidth={2.25} />
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
