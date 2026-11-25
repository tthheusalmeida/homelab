import { useCallback, useState } from "react";

import { parseStoredOrder } from "../customOrder";

/**
 * Ordem personalizada guardada no navegador (localStorage). `null` = ordem automática (A–Z, recentes).
 * É só uma conveniência do usuário: se o armazenamento falhar, a ordem vale nesta sessão.
 */
export function useCustomOrder(
  key: string,
): [string[] | null, (order: string[] | null) => void] {
  const [order, setOrder] = useState<string[] | null>(() => {
    try {
      return parseStoredOrder(window.localStorage.getItem(key));
    } catch {
      return null;
    }
  });

  const update = useCallback(
    (next: string[] | null) => {
      setOrder(next);

      try {
        if (next) {
          window.localStorage.setItem(key, JSON.stringify(next));
        } else {
          window.localStorage.removeItem(key);
        }
      } catch {
        // sem armazenamento: a ordem vale só nesta sessão
      }
    },
    [key],
  );

  return [order, update];
}
