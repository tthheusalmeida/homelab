import { useCallback, useEffect, useRef, useState } from "react";

import { useDebouncedValue } from "./use-debounced-value";
import { useTextHighlight } from "./use-text-highlight";

/**
 * Busca no texto de uma tela (Ctrl+F): guarda o que foi digitado, destaca as
 * ocorrências em `container` e entrega as props prontas do `FindBar`. `open`
 * diz se a barra está visível (Ctrl+F abre e foca; Esc ou fechar esconde e
 * limpa). `version` muda quando o texto é redesenhado.
 */
export function useFind(container: HTMLElement | null, version?: unknown) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const query = useDebouncedValue(search);
  const highlight = useTextHighlight(container, query, version);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "f"
      ) {
        event.preventDefault();
        setOpen(true);
        setFocusTick((tick) => tick + 1);
      }
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (focusTick > 0) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [focusTick]);

  const close = useCallback(() => {
    setSearch("");
    setOpen(false);
  }, []);

  return {
    open,
    search,
    /** Consulta já "assentada" (depois do debounce), para outras buscas na tela. */
    query,
    barProps: {
      value: search,
      onChange: setSearch,
      count: highlight.count,
      index: highlight.index,
      onNext: highlight.next,
      onPrev: highlight.prev,
      inputRef,
    },
    close,
  };
}
