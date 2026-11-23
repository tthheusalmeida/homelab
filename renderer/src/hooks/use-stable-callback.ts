import { useCallback, useEffect, useRef } from "react";

/**
 * Função com identidade fixa que sempre chama a versão mais recente de `fn`. Serve para passar
 * callbacks a filhos memoizados (`memo`) sem que cada render do pai os refaça.
 */
export function useStableCallback<Args extends unknown[], Result>(
  fn: (...args: Args) => Result,
): (...args: Args) => Result {
  const latest = useRef(fn);

  useEffect(() => {
    latest.current = fn;
  });

  return useCallback((...args: Args) => latest.current(...args), []);
}
