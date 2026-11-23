import { useCallback, useEffect, useRef, useState } from "react";

import { whenScrollSettles } from "#lib/scroll-settle";

import { useDebouncedValue } from "./use-debounced-value";
import { useTextHighlight } from "./use-text-highlight";

/**
 * Busca no texto de uma tela (Ctrl+F): guarda o que foi digitado, destaca as
 * ocorrências em `container` e entrega as props prontas do `FindBar`. `open`
 * diz se a barra está visível (Ctrl+F abre e foca; Esc ou fechar esconde e
 * limpa). `version` muda quando o texto é redesenhado.
 */
/** Quanto tempo a marca do trecho escolhido na lista fica na tela. */
export const FLASH_MS = 1000;
/** Os últimos milissegundos do `FLASH_MS`, em que a marca vai sumindo (opacidade). */
export const FADE_MS = 300;

export function useFind(container: HTMLElement | null, version?: unknown) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const settled = useDebouncedValue(search);
  // Limpar o campo apaga as marcas na hora (sem esperar o debounce).
  const query = search === "" ? "" : settled;
  const highlight = useTextHighlight(container, query, version);
  const { setOnlyCurrent, select, fadeOut, unfade } = highlight;
  const flash = useRef<number | undefined>(undefined);
  const fade = useRef<number | undefined>(undefined);
  const stopWaiting = useRef<(() => void) | undefined>(undefined);

  const cancelFlash = useCallback(() => {
    window.clearTimeout(flash.current);
    window.clearTimeout(fade.current);
    flash.current = undefined;
    stopWaiting.current?.();
    stopWaiting.current = undefined;
    setOnlyCurrent(false);
    unfade();
  }, [setOnlyCurrent, unfade]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        event.key.toLowerCase() === "f"
      ) {
        event.preventDefault();
        cancelFlash();
        setOpen(true);
        setFocusTick((tick) => tick + 1);
      }
    };

    document.addEventListener("keydown", onKey);

    return () => document.removeEventListener("keydown", onKey);
  }, [cancelFlash]);

  useEffect(() => {
    if (focusTick > 0) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [focusTick]);

  useEffect(
    () => () => {
      window.clearTimeout(flash.current);
      window.clearTimeout(fade.current);
      stopWaiting.current?.();
    },
    [],
  );

  const close = useCallback(() => {
    cancelFlash();
    setSearch("");
    setOpen(false);
  }, [cancelFlash]);

  /**
   * Escolheu um trecho da lista: vai até ele e fecha a barra, deixando só essa marca. A contagem
   * de 1 s para sumir (com opacidade no fim) só começa quando a rolagem chega lá; em textos longos
   * a rolagem demora e a marca não pode sumir antes de ser vista.
   */
  const pick = useCallback(
    (position: number) => {
      cancelFlash();
      select(position);
      setOnlyCurrent(true);
      setOpen(false);

      stopWaiting.current = whenScrollSettles(() => {
        stopWaiting.current = undefined;
        fade.current = window.setTimeout(() => fadeOut(FADE_MS), FLASH_MS - FADE_MS);
        flash.current = window.setTimeout(() => {
          flash.current = undefined;
          setOnlyCurrent(false);
          setSearch("");
        }, FLASH_MS);
      });
    },
    [cancelFlash, select, setOnlyCurrent, fadeOut],
  );

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
    /** Lista de ocorrências com trecho (clicar vai até ela), para o `FindBar`. */
    results: {
      items: highlight.snippets,
      current: highlight.index,
      onSelect: pick,
    },
    close,
  };
}
