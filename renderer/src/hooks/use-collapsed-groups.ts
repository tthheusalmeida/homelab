import { useCallback, useState } from "react";

export const COLLAPSED_GROUPS_KEY = "homelab.sidebar-collapsed";

function read(): ReadonlySet<string> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(COLLAPSED_GROUPS_KEY) ?? "[]");

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
 * conveniência de tela: nunca é um dado importante.
 */
export function useCollapsedGroups(): [ReadonlySet<string>, (label: string) => void] {
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(read);

  const toggle = useCallback((label: string) => {
    setCollapsed((current) => {
      const next = new Set(current);

      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }

      try {
        window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify([...next]));
      } catch {
        // sem armazenamento: a escolha vale só nesta sessão
      }

      return next;
    });
  }, []);

  return [collapsed, toggle];
}
