import { useEffect, useRef } from "react";

import type { IpcEvent, IpcEventPayload } from "#shared/events";

/**
 * Escuta um evento enviado pelo main (progresso, avisos...). O handler pode mudar a cada render sem
 * reassinar o evento; a escuta termina quando o componente sai da tela.
 */
export function useIpcEvent<E extends IpcEvent>(
  event: E,
  handler: (payload: IpcEventPayload<E>) => void,
): void {
  const latest = useRef(handler);

  useEffect(() => {
    latest.current = handler;
  });

  useEffect(() => {
    // Sem o preload (ou num mock sem eventos) não há o que escutar.
    if (typeof window.api?.on !== "function") {
      return undefined;
    }

    return window.api.on(event, (payload) => latest.current(payload));
  }, [event]);
}
