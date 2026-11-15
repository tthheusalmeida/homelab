import {
  ACCENT_IDS,
  DEFAULT_APPEARANCE,
  THEME_MODES,
  type AccentId,
  type Appearance,
  type ThemeMode,
} from "#shared/contracts/appearance";

/** Cópia local da aparência: o tema certo aparece antes do primeiro quadro (ver public/theme-init.js). */
export const APPEARANCE_CACHE_KEY = "homelab.appearance";
/** Canal entre as janelas (mesma origem): a troca nas Configurações vale na hora no app. */
export const APPEARANCE_CHANNEL = "homelab-appearance";

export const themeLabels: Record<ThemeMode, string> = {
  system: "Sistema",
  light: "Claro",
  dark: "Escuro",
};

export const accentLabels: Record<AccentId, string> = {
  cyan: "Ciano",
  blue: "Azul",
  indigo: "Índigo",
  violet: "Violeta",
  emerald: "Esmeralda",
  rose: "Rosa",
  orange: "Laranja",
};

export function resolveMode(
  theme: ThemeMode,
  systemDark: boolean,
): "light" | "dark" {
  return theme === "system" ? (systemDark ? "dark" : "light") : theme;
}

/** Aplica a aparência no elemento raiz: classe `dark`, `data-accent` e `color-scheme`. */
export function applyAppearance(
  root: HTMLElement,
  appearance: Appearance,
  systemDark: boolean,
) {
  const dark = resolveMode(appearance.theme, systemDark) === "dark";

  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
  root.dataset.accent = appearance.accent;
}

/** Aceita só uma aparência válida; qualquer outra coisa vira `null`. */
export function parseAppearance(value: unknown): Appearance | null {
  const candidate = value as Partial<Appearance> | null;

  if (
    candidate &&
    THEME_MODES.includes(candidate.theme as ThemeMode) &&
    ACCENT_IDS.includes(candidate.accent as AccentId)
  ) {
    return {
      theme: candidate.theme as ThemeMode,
      accent: candidate.accent as AccentId,
    };
  }

  return null;
}

export function readCachedAppearance(
  storage: Pick<Storage, "getItem"> = localStorage,
): Appearance {
  try {
    const raw = storage.getItem(APPEARANCE_CACHE_KEY);

    return parseAppearance(JSON.parse(raw ?? "null")) ?? DEFAULT_APPEARANCE;
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeCachedAppearance(
  appearance: Appearance,
  storage: Pick<Storage, "setItem"> = localStorage,
) {
  try {
    storage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(appearance));
  } catch {
    // sem armazenamento local: só perde o tema certo antes do primeiro quadro
  }
}
