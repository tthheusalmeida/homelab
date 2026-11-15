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
  writeCachedAppearance,
} from "#lib/appearance";
import { ipc } from "#lib/ipc";
import { IpcChannels } from "#shared/channels";
import {
  DEFAULT_APPEARANCE,
  type Appearance,
} from "#shared/contracts/appearance";

export interface AppearanceApi {
  appearance: Appearance;
  /** Troca já na tela, grava e avisa as outras janelas; se a gravação falhar, volta ao anterior. */
  update(patch: Partial<Appearance>): Promise<void>;
  reset(): Promise<void>;
}

export const AppearanceContext = createContext<AppearanceApi | null>(null);

/** Lógica do provedor de aparência (ver `components/AppearanceProvider`). */
export function useAppearanceState(): AppearanceApi {
  const [appearance, setAppearance] = useState<Appearance>(() =>
    readCachedAppearance(),
  );
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const current = useRef(appearance);
  const channel = useRef<BroadcastChannel | null>(null);

  const adopt = useCallback((next: Appearance) => {
    current.current = next;
    setAppearance(next);
    writeCachedAppearance(next);
  }, []);

  // Segue o tema do sistema enquanto o modo for "Sistema".
  useEffect(() => {
    const query = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(query.matches);

    query.addEventListener("change", onChange);

    return () => query.removeEventListener("change", onChange);
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
    async (patch: Partial<Appearance>) => {
      const previous = current.current;
      const next = { ...previous, ...patch };

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

  const reset = useCallback(() => update(DEFAULT_APPEARANCE), [update]);

  return { appearance, update, reset };
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
