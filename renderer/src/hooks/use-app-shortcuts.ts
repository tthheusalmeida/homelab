import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";

import {
  GO_SHORTCUT_TIMEOUT_MS,
  isPaletteShortcut,
  isTypingTarget,
  urlForGoKey,
} from "#lib/shortcuts";

/**
 * Atalhos globais do app:
 * - `Ctrl+K` / `Cmd+K` (ou `/` fora de campos) abre a paleta de comandos;
 * - `G` e depois uma letra troca de tela (ex.: `G T` abre Nova tarefa).
 * Atalhos de uma tecla só valem fora de campos de digitação e sem Ctrl/Alt/Cmd.
 */
export function useAppShortcuts(onOpenPalette: () => void): void {
  const navigate = useNavigate();
  const waitingForSecondKey = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const stopWaiting = () => {
      clearTimeout(waitingForSecondKey.current);
      waitingForSecondKey.current = undefined;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (isPaletteShortcut(event)) {
        event.preventDefault();
        stopWaiting();
        onOpenPalette();

        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) {
        return;
      }

      if (waitingForSecondKey.current !== undefined) {
        const url = urlForGoKey(event.key);

        stopWaiting();

        if (url) {
          event.preventDefault();
          void navigate(url);
        }

        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        onOpenPalette();
      } else if (event.key.toLowerCase() === "g") {
        waitingForSecondKey.current = setTimeout(stopWaiting, GO_SHORTCUT_TIMEOUT_MS);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      stopWaiting();
    };
  }, [navigate, onOpenPalette]);
}
