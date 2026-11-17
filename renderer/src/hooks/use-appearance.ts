import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  applyAppearance,
  APPEARANCE_CHANNEL,
  parseAppearance,
  readCachedAppearance,
  resolveMode,
  writeCachedAppearance,
} from "#lib/appearance";
import { ipc } from "#lib/ipc";
import { IpcChannels } from "#shared/channels";
import {
  DEFAULT_APPEARANCE,
  type Appearance,
  type AppearancePatch,
} from "#shared/contracts/appearance";
import {
  DEFAULT_READING,
  type ReadingPreferences,
} from "#shared/contracts/reading";

export interface AppearanceApi {
  appearance: Appearance;
  /** Troca já na tela, grava e avisa as outras janelas; se a gravação falhar, volta ao anterior. */
  update(patch: AppearancePatch): Promise<void>;
  /** Muda só parte da leitura (fonte, tamanho, zoom, cores); o resto fica como está. */
  updateReading(patch: Partial<ReadingPreferences>): Promise<void>;
  reset(): Promise<void>;
  resetReading(): Promise<void>;
}

export const AppearanceContext = createContext<AppearanceApi | null>(null);

function useSystemDark(): boolean {
  const [dark, setDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setDark(query.matches);

    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
  }, []);

  return dark;
}

/** Lógica do provedor de aparência (ver `components/AppearanceProvider`). */
export function useAppearanceState(): AppearanceApi {
  const [appearance, setAppearance] = useState<Appearance>(() =>
    readCachedAppearance(),
  );
  const systemDark = useSystemDark();
  const current = useRef(appearance);
  const channel = useRef<BroadcastChannel | null>(null);

  const adopt = useCallback((next: Appearance) => {
    current.current = next;
    setAppearance(next);
    writeCachedAppearance(next);
  }, []);

  useEffect(() => {
    applyAppearance(document.documentElement, appearance, systemDark);
  }, [appearance, systemDark]);

  // Valor salvo no main (fonte da verdade): ao abrir e sempre que a janela volta ao foco.
  useEffect(() => {
    const load = () => {
      ipc
        .invoke(IpcChannels.appearance.get)
        .then((saved) => {
          const valid = parseAppearance(saved);

          if (valid) {
            adopt(valid);
          }
        })
        .catch(() => undefined);
    };

    load();
    window.addEventListener("focus", load);

    return () => window.removeEventListener("focus", load);
  }, [adopt]);

  // Troca feita em outra janela do app.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }

    const own = new BroadcastChannel(APPEARANCE_CHANNEL);

    channel.current = own;
    own.onmessage = (event) => {
      const valid = parseAppearance(event.data);

      if (valid) {
        adopt(valid);
      }
    };

    return () => {
      own.close();
      channel.current = null;
    };
  }, [adopt]);

  const update = useCallback(
    async (patch: AppearancePatch) => {
      const previous = current.current;
      const next: Appearance = {
        ...previous,
        ...patch,
        reading: { ...previous.reading, ...patch.reading },
      };

      adopt(next);

      try {
        const saved = parseAppearance(
          await ipc.invoke(IpcChannels.appearance.update, patch),
        );

        if (saved) {
          adopt(saved);
        }

        channel.current?.postMessage(saved ?? next);
      } catch (error) {
        adopt(previous);
        throw error;
      }
    },
    [adopt],
  );

  const updateReading = useCallback(
    (patch: Partial<ReadingPreferences>) => update({ reading: patch }),
    [update],
  );

  const reset = useCallback(() => update(DEFAULT_APPEARANCE), [update]);

  const resetReading = useCallback(
    () => update({ reading: DEFAULT_READING }),
    [update],
  );

  return { appearance, update, updateReading, reset, resetReading };
}

/**
 * Preferências de leitura e o tema ativo. Fora de um `AppearanceProvider` (ex.: testes de tela)
 * vale o padrão, para a leitura nunca depender do provedor.
 */
export function useReadingPreferences(): {
  reading: ReadingPreferences;
  dark: boolean;
  updateReading: AppearanceApi["updateReading"] | null;
} {
  const api = useContext(AppearanceContext);
  const mode = api?.appearance.theme ?? "system";
  const systemDark = useSystemDark();

  return {
    reading: api?.appearance.reading ?? DEFAULT_READING,
    dark: resolveMode(mode, systemDark) === "dark",
    updateReading: api?.updateReading ?? null,
  };
}

export function useAppearance(): AppearanceApi {
  const api = useContext(AppearanceContext);

  if (!api) {
    throw new Error(
      "useAppearance precisa estar dentro de um AppearanceProvider.",
    );
  }

  return api;
}
