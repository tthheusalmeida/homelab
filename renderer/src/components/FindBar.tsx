import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

import { HexDot } from "#components/Hex";
import { Button } from "#ui/button";
import { Input } from "#ui/input";
import type { FoundSnippet } from "#hooks/use-text-highlight";
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
  /** Fecha a barra (Esc com o campo vazio e o botão de fechar). */
  onClose: () => void;
  /** Para focar o campo de fora (Ctrl+F). */
  inputRef?: React.Ref<HTMLInputElement>;
  /** Onde se pesquisa ("livro", "página"...). */
  label?: string;
  /** Lista de ocorrências com trecho; clicar em uma vai até ela. Sem ela, só o campo. */
  results?: {
    items: FoundSnippet[];
    current: number;
    onSelect: (index: number) => void;
  };
}

/**
 * Busca dentro do texto da tela, flutuante e centralizada no topo (colado na borda), acima de tudo,
 * inclusive do modo leitura. Mostra "3 de 12", navega entre as ocorrências (Enter = próxima,
 * Shift+Enter = anterior, Esc limpa e, vazio, fecha) e, com `results`, lista os trechos achados.
 * Abre com Ctrl+F (ver `useFind`). Clicar fora dela também fecha.
 */
export function FindBar({
  value,
  onChange,
  count,
  index,
  onNext,
  onPrev,
  onClose,
  inputRef,
  label = "Pesquisar na página",
  results,
}: FindBarProps) {
  const searching = value.trim().length >= 2;
  const rootRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  closeRef.current = onClose;

  // Clicar fora da barra fecha (e limpa a busca, como o Esc com o campo vazio).
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeRef.current();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return createPortal(
    <div
      ref={rootRef}
      role="search"
      className="fixed inset-x-0 top-0 z-[70] mx-auto flex w-[min(34rem,calc(100vw-2rem))] animate-enter-fade flex-col gap-2 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg"
    >
      <div className="flex items-center gap-2">
        <div className="relative flex min-w-0 flex-1 items-center">
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

              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();

                if (value !== "") {
                  onChange("");
                } else {
                  onClose();
                }
              }
            }}
          />
        </div>

        {searching && (
          <span
            aria-live="polite"
            className="flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"
          >
            {count > 0 && <HexDot pulse className="bg-primary" />}

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
            aria-label="Fechar pesquisa"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
      </div>

      {searching && results && results.items.length > 0 && (
        <ul
          aria-label="Resultados da pesquisa"
          className="max-h-[50dvh] space-y-1 overflow-y-auto"
        >
          {results.items.map((item, position) => (
            <li key={position}>
              <button
                type="button"
                aria-current={position === results.current || undefined}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted",
                  position === results.current && "bg-muted",
                )}
                onClick={() => results.onSelect(position)}
              >
                {item.before}
                <strong className="font-semibold text-foreground">
                  {item.match}
                </strong>
                {item.after}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}
