import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

import { Button } from "#ui/button";
import { Input } from "#ui/input";
import { cn } from "#lib/utils";

export interface FindBarProps {
  value: string;
  onChange: (value: string) => void;
  /** Ocorrências do termo no texto. */
  count: number;
  /** Ocorrência atual (0 a count-1). */
  index: number;
  onNext: () => void;
  onPrev: () => void;
  /** Para focar o campo de fora (Ctrl+F). */
  inputRef?: React.Ref<HTMLInputElement>;
  /** Onde se pesquisa ("livro", "página"...). */
  label?: string;
  /** Contador e setas na mesma linha do campo (barras de cima). */
  compact?: boolean;
  /** Flutua no canto da janela, acima de tudo (inclusive do modo leitura). */
  floating?: boolean;
  /** Esconde a barra: Esc com o campo vazio e o botão de fechar. Sem ele, a barra é fixa. */
  onClose?: () => void;
  className?: string;
}

/**
 * Campo de busca dentro de um texto: mostra "3 de 12" e navega entre as
 * ocorrências (Enter = próxima, Shift+Enter = anterior, Esc limpa e, vazio,
 * fecha; Ctrl+F foca o campo, ver `useFind`).
 */
export function FindBar({
  value,
  onChange,
  count,
  index,
  onNext,
  onPrev,
  inputRef,
  label = "Pesquisar na página",
  compact: compactProp = false,
  floating = false,
  onClose,
  className,
}: FindBarProps) {
  const searching = value.trim().length >= 2;
  const compact = compactProp || floating;

  const bar = (
    <div
      className={cn(
        "min-w-0 flex-1",
        compact && "flex items-center gap-2",
        className,
      )}
    >
      <div className="relative flex min-w-0 flex-1 items-center gap-1">
        <Search className="pointer-events-none absolute left-2.5 size-4 text-muted-foreground" />

        <Input
          ref={inputRef}
          type="search"
          value={value}
          placeholder={`${label}... (Ctrl+F)`}
          aria-label={label}
          className="pl-8"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();

              if (event.shiftKey) {
                onPrev();
              } else {
                onNext();
              }
            }

            if (event.key === "Escape" && (value !== "" || onClose)) {
              event.preventDefault();
              event.stopPropagation();

              if (value !== "") {
                onChange("");
              } else {
                onClose?.();
              }
            }
          }}
        />
      </div>

      {(searching || (compact && onClose)) && (
        <div
          className={cn(
            "flex items-center justify-between gap-2 text-xs text-muted-foreground",
            !compact && "mt-1.5",
          )}
        >
          {searching && (
            <span aria-live="polite" className="whitespace-nowrap">
              {count === 0 ? "Nenhuma ocorrência" : `${index + 1} de ${count}`}
            </span>
          )}

          <div className="flex gap-1">
            {searching && (
              <>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Ocorrência anterior"
                  disabled={count === 0}
                  onClick={onPrev}
                >
                  <ChevronUp />
                </Button>

                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Próxima ocorrência"
                  disabled={count === 0}
                  onClick={onNext}
                >
                  <ChevronDown />
                </Button>
              </>
            )}

            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={onClose ? "Fechar pesquisa" : "Limpar pesquisa"}
              onClick={() => (onClose ? onClose() : onChange(""))}
            >
              <X />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return floating
    ? createPortal(
        <div
          role="search"
          className="fixed right-4 top-16 z-[70] flex w-[min(30rem,calc(100vw-2rem))] animate-enter-fade rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg"
        >
          {bar}
        </div>,
        document.body,
      )
    : bar;
}
