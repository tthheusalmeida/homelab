import * as fs from "node:fs";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ACCENT_IDS, DEFAULT_APPEARANCE } from "#shared/contracts/appearance";

import {
  accentLabels,
  applyAppearance,
  APPEARANCE_CACHE_KEY,
  parseAppearance,
  readCachedAppearance,
  resolveMode,
  themeLabels,
  writeCachedAppearance,
} from "./appearance";

const css = fs.readFileSync(path.join(__dirname, "..", "global.css"), "utf8");

describe("resolveMode", () => {
  it.each([
    ["system", true, "dark"],
    ["system", false, "light"],
    ["light", true, "light"],
    ["dark", false, "dark"],
  ] as const)(
    "when the theme is %s and the system is dark=%s, should resolve to %s",
    (theme, systemDark, expected) => {
      expect(resolveMode(theme, systemDark)).toBe(expected);
    },
  );
});

describe("applyAppearance", () => {
  afterEach(() => {
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-accent");
    document.documentElement.style.colorScheme = "";
  });

  it("when the theme resolves to dark, should add the dark class and the dark color scheme", () => {
    applyAppearance(
      document.documentElement,
      { theme: "dark", accent: "cyan" },
      false,
    );

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("when the theme is system and the system is light, should remove the dark class", () => {
    document.documentElement.classList.add("dark");

    applyAppearance(
      document.documentElement,
      { theme: "system", accent: "cyan" },
      false,
    );

    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("when an accent is chosen, should expose it in data-accent", () => {
    applyAppearance(
      document.documentElement,
      { theme: "light", accent: "violet" },
      true,
    );

    expect(document.documentElement.dataset.accent).toBe("violet");
  });
});

describe("parseAppearance", () => {
  it("when the value is valid, should return it", () => {
    expect(parseAppearance({ theme: "dark", accent: "rose" })).toEqual({
      theme: "dark",
      accent: "rose",
    });
  });

  it.each([
    null,
    undefined,
    "dark",
    {},
    { theme: "sepia", accent: "cyan" },
    { theme: "dark", accent: "pink" },
  ])("when the value is %j, should return null", (value) => {
    expect(parseAppearance(value)).toBeNull();
  });
});

describe("cached appearance", () => {
  it("when nothing was saved, should read the default", () => {
    expect(readCachedAppearance({ getItem: () => null })).toEqual(
      DEFAULT_APPEARANCE,
    );
  });

  it("when the saved text is broken, should read the default", () => {
    expect(readCachedAppearance({ getItem: () => "{nope" })).toEqual(
      DEFAULT_APPEARANCE,
    );
  });

  it("when storage throws, should read the default", () => {
    const storage = {
      getItem: () => {
        throw new Error("bloqueado");
      },
    };

    expect(readCachedAppearance(storage)).toEqual(DEFAULT_APPEARANCE);
  });

  it("when the appearance is written, should read it back from the same key", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    };

    writeCachedAppearance({ theme: "light", accent: "orange" }, storage);

    expect(store.has(APPEARANCE_CACHE_KEY)).toBe(true);
    expect(readCachedAppearance(storage)).toEqual({
      theme: "light",
      accent: "orange",
    });
  });

  it("when storage refuses to write, should not throw", () => {
    const storage = {
      setItem: () => {
        throw new Error("cheio");
      },
    };

    expect(() =>
      writeCachedAppearance(DEFAULT_APPEARANCE, storage),
    ).not.toThrow();
  });
});

describe("labels and tokens", () => {
  it("when listing the accents, should have a label for each one", () => {
    expect(Object.keys(accentLabels).sort()).toEqual([...ACCENT_IDS].sort());
  });

  it("when listing the themes, should have the three labels", () => {
    expect(Object.values(themeLabels)).toEqual(["Sistema", "Claro", "Escuro"]);
  });

  it.each(ACCENT_IDS)(
    "when the %s accent is chosen, should have a light and a dark token block in the stylesheet",
    (accent) => {
      expect(css).toContain(`[data-accent="${accent}"] {`);
      expect(css).toContain(`.dark[data-accent="${accent}"]`);
    },
  );

  it("when no accent is set, should default to the cyan of the icon", () => {
    expect(css).toMatch(/\.dark \{[\s\S]*?--primary: #22d3ee;/);
  });

  it("when the pre-paint script runs, should read the same storage key as the app", () => {
    const script = fs.readFileSync(
      path.join(__dirname, "..", "..", "public", "theme-init.js"),
      "utf8",
    );

    expect(script).toContain(APPEARANCE_CACHE_KEY);
  });
});
