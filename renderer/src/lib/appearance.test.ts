import * as fs from "node:fs";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { ACCENT_IDS, DEFAULT_APPEARANCE } from "#shared/contracts/appearance";
import { DEFAULT_TRANSCRIPT } from "#shared/contracts/document-views";
import { DEFAULT_READING } from "#shared/contracts/reading";

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
      { theme: "dark", accent: "cyan", reading: DEFAULT_READING, transcript: DEFAULT_TRANSCRIPT },
      false,
    );

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });

  it("when the theme is system and the system is light, should remove the dark class", () => {
    document.documentElement.classList.add("dark");

    applyAppearance(
      document.documentElement,
      { theme: "system", accent: "cyan", reading: DEFAULT_READING, transcript: DEFAULT_TRANSCRIPT },
      false,
    );

    expect(document.documentElement).not.toHaveClass("dark");
    expect(document.documentElement.style.colorScheme).toBe("light");
  });

  it("when an accent is chosen, should expose it in data-accent", () => {
    applyAppearance(
      document.documentElement,
      { theme: "light", accent: "violet", reading: DEFAULT_READING, transcript: DEFAULT_TRANSCRIPT },
      true,
    );

    expect(document.documentElement.dataset.accent).toBe("violet");
  });
});

describe("parseAppearance", () => {
  it("when the value is valid, should return it", () => {
    expect(parseAppearance({ theme: "dark", accent: "rose", reading: DEFAULT_READING, transcript: DEFAULT_TRANSCRIPT })).toEqual({
      theme: "dark",
      accent: "rose",
      reading: DEFAULT_READING, transcript: DEFAULT_TRANSCRIPT
    });
  });

  it.each([
    null,
    undefined,
    "dark",
    {},
    { theme: "sepia", accent: "cyan", reading: DEFAULT_READING, transcript: DEFAULT_TRANSCRIPT },
    { theme: "dark", accent: "brown", reading: DEFAULT_READING, transcript: DEFAULT_TRANSCRIPT },
  ])("when the value is %j, should return null", (value) => {
    expect(parseAppearance(value)).toBeNull();
  });
});

describe("parseAppearance reading", () => {
  it("when an old copy has no reading preferences, should fill them with the defaults", () => {
    expect(parseAppearance({ theme: "dark", accent: "rose" })).toEqual({
      theme: "dark",
      accent: "rose",
      reading: DEFAULT_READING, transcript: DEFAULT_TRANSCRIPT
    });
  });

  it("when the reading preferences are valid, should keep them", () => {
    const reading = { ...DEFAULT_READING, font: "lora", fontSize: 22 };

    expect(
      parseAppearance({ theme: "dark", accent: "rose", reading })?.reading,
    ).toEqual(reading);
  });

  it("when the reading preferences are invalid, should fall back to the defaults", () => {
    const reading = { ...DEFAULT_READING, fontSize: 15 };

    expect(
      parseAppearance({ theme: "dark", accent: "rose", reading })?.reading,
    ).toEqual(DEFAULT_READING);
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

    writeCachedAppearance({ theme: "light", accent: "orange", reading: DEFAULT_READING, transcript: DEFAULT_TRANSCRIPT }, storage);

    expect(store.has(APPEARANCE_CACHE_KEY)).toBe(true);
    expect(readCachedAppearance(storage)).toEqual({
      theme: "light",
      accent: "orange",
      reading: DEFAULT_READING, transcript: DEFAULT_TRANSCRIPT
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

describe("accent order", () => {
  it("when listing the accents, should offer 15 from the warmest to the coldest", () => {
    expect(ACCENT_IDS).toHaveLength(15);
    expect(ACCENT_IDS[0]).toBe("pink");
    expect(ACCENT_IDS[ACCENT_IDS.length - 1]).toBe("violet");
    expect(ACCENT_IDS.indexOf("orange")).toBeLessThan(ACCENT_IDS.indexOf("green"));
    expect(ACCENT_IDS.indexOf("green")).toBeLessThan(ACCENT_IDS.indexOf("blue"));
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

describe("reading surface tokens", () => {
  it("when a reading color is chosen, should redefine the theme tokens inside the surface so the whole reading mode follows the palette", () => {
    const block = css.slice(css.indexOf("Ambiente imersivo"));
    const bg = block.slice(block.indexOf(".reading-surface[data-custom-bg] {"));
    const fg = block.slice(block.indexOf(".reading-surface[data-custom-fg] {"));

    for (const token of ["--background", "--card", "--popover", "--muted", "--accent", "--border", "--input"]) {
      expect(bg.slice(0, bg.indexOf("}"))).toContain(`${token}:`);
    }
    for (const token of ["--foreground", "--card-foreground", "--muted-foreground"]) {
      expect(fg.slice(0, fg.indexOf("}"))).toContain(`${token}:`);
    }
  });

  it("when a reading color is chosen, should derive the borders from the text color so they contrast with the chosen background", () => {
    const block = css.slice(css.indexOf("Ambiente imersivo"));
    const bg = block.slice(block.indexOf(".reading-surface[data-custom-bg] {"));

    expect(bg.slice(0, bg.indexOf("}"))).toMatch(/--border: color-mix\(in oklab, var\(--reading-fg\)/);
  });
});

describe("reading chrome", () => {
  const chrome = () => {
    const start = css.indexOf(".reading-chrome {");

    return css.slice(start, css.indexOf("\n}", start));
  };

  it("when the reading mode draws its header and side panel, should shift the page tone toward the text so they stand out less", () => {
    expect(chrome()).toMatch(/--chrome-bg: color-mix\(in oklab, var\(--background\), var\(--foreground\)/);
    expect(chrome()).toContain("background-color: var(--chrome-bg)");
  });

  it("when the reading mode draws its header and side panel, should soften the letters and the borders", () => {
    expect(chrome()).toMatch(/\n  color: color-mix\(in oklab, var\(--foreground\) \d+%, transparent\)/);
    expect(chrome()).toMatch(/border-color: color-mix/);
  });

  it("when cards sit inside the chrome, should keep them one step apart from its background", () => {
    expect(chrome()).toMatch(/--card: color-mix\(in oklab, var\(--chrome-bg\)/);
  });
});

describe("sidebar cards", () => {
  const block = () => {
    const start = css.indexOf(".sidebar-card {");

    return css.slice(start, css.indexOf("\n}", start));
  };

  it("when the side panel shows its cards, should make them clearly stand out from the background", () => {
    expect(block()).toMatch(/background-color: color-mix\(in oklab, var\(--chrome-bg, var\(--background\)\), var\(--foreground\) 10%\)/);
  });

  it("when the side panel shows its cards, should outline them with a fine line derived from the text", () => {
    expect(block()).toMatch(/box-shadow: 0 0 0 1px color-mix\(in oklab, var\(--foreground\) 22%, transparent\)/);
  });
});

describe("readable secondary text in the reading environment", () => {
  const rule = (selector: string) => {
    const start = css.indexOf(selector);

    return css.slice(start, css.indexOf("\n}", start));
  };

  it("when the reading has chosen colors, should keep secondary text at 75% of the text color or more", () => {
    expect(rule(".reading-surface[data-custom-fg] {")).toMatch(/--muted-foreground: color-mix\(in oklab, var\(--reading-fg\) (7[5-9]|[89]\d)%/);
  });

  it("when the chrome shows secondary text, should keep it at 70% of the text color or more", () => {
    expect(rule(".reading-chrome {")).toMatch(/--muted-foreground: color-mix\(in oklab, var\(--foreground\) (7\d|[89]\d)%/);
  });
});

describe("parseAppearance transcript", () => {
  const base = { theme: "dark", accent: "cyan" };

  it("when an old copy has no transcript, should use the default", () => {
    expect(parseAppearance(base)).toMatchObject({ transcript: DEFAULT_TRANSCRIPT });
  });

  it("when the transcript is saved, should keep it", () => {
    expect(
      parseAppearance({ ...base, transcript: { preview: false, progress: false } }),
    ).toMatchObject({ transcript: { preview: false, progress: false } });
  });

  it("when the transcript is invalid, should fall back to the default", () => {
    expect(parseAppearance({ ...base, transcript: { preview: "x" } })).toMatchObject({
      transcript: DEFAULT_TRANSCRIPT,
    });
  });

  it("when an old copy still has the removed summary option, should ignore it", () => {
    expect(parseAppearance({ ...base, summary: { outline: false } })).not.toHaveProperty("summary");
  });
});
