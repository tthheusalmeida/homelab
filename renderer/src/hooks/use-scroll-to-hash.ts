import { useEffect } from "react";

import { useLocation } from "react-router";

import { scrollToId } from "#lib/scroll";

/**
 * Rola até a seção pedida no endereço (`/library/<id>#fluxo-de-trabalho`), o que faz o link de um
 * resultado da busca cair no ponto certo da página. Espera a página estar pronta (`ready`) e o
 * navegador desenhar o texto antes de rolar.
 */
export function useScrollToHash(ready: boolean) {
  const { hash } = useLocation();

  useEffect(() => {
    if (!ready || hash.length <= 1) {
      return;
    }

    const frame = requestAnimationFrame(() => scrollToId(decodeURIComponent(hash.slice(1))));

    return () => cancelAnimationFrame(frame);
  }, [ready, hash]);
}
