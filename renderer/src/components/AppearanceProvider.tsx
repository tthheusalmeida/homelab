import type { ReactNode } from "react";

import { AppearanceContext, useAppearanceState } from "#hooks/use-appearance";

/** Aplica tema e cor de destaque no app e oferece `useAppearance()` aos componentes. */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const api = useAppearanceState();

  return (
    <AppearanceContext.Provider value={api}>
      {children}
    </AppearanceContext.Provider>
  );
}
