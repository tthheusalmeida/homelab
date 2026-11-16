import { useCallback, useState } from "react";

export const COLLAPSED_GROUPS_KEY = "homelab.sidebar-collapsed";

function read(key: string): ReadonlySet<string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");

    return new Set(
      Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [],
    );
  } catch {
    return new Set();
  }
}

/**
 * Quais seções da barra lateral estão recolhidas, lembrado entre aberturas do app (localStorage).
 * Tudo começa aberto; se o armazenamento falhar ou estiver ilegível, volta a abrir tudo. É só uma
 * conveniência de tela: nunca é um dado importante. Cada barra lateral usa a sua chave (a do app
 * e a das Configurações são independentes).
 */
export function useCollapsedGroups(
  storageKey: string = COLLAPSED_GROUPS_KEY,
): [ReadonlySet<string>, (label: string) => void] {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => read(storageKey));

  const toggle = useCallback((label: string) => {
    setCollapsed((current) => {
      const next = new Set(current);

      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }

      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // sem armazenamento: a escolha vale só nesta sessão
      }

      return next;
    });
  }, [storageKey]);

  return [collapsed, toggle];
}
