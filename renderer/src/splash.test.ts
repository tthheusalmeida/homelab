import * as fs from "node:fs";
import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { hexPath } from "#components/Hex";

const root = path.join(__dirname, "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

// Os hexágonos das páginas estáticas têm de ser os do `Logo`/`HexLoader`: mesma geometria.
const cluster = [
  [24, 15.5],
  [31.4, 28.4],
  [16.6, 28.4],
].map(([cx, cy]) => hexPath(cx, cy, 6.6));

describe("loading de abertura", () => {
  it.each(["splash.html", "index.html"])(
    "when %s is read, should draw the same three hexagons as the HexLoader",
    (file) => {
      const html = read(file);

      for (const d of cluster) {
        expect(html).toContain(`d="${d}"`);
      }
      expect(html).toContain("hex-loader");
      expect(html).toContain("boot-splash__mark");
      // Tamanho explícito: mesmo sem o CSS (no dev ele chega depois), o ícone não ocupa a página.
      expect(html).toContain('width="64" height="64"');
    },
  );

  it("when the app page is read, should show the loader inside #root until React mounts", () => {
    const html = read("index.html");

    expect(html).toMatch(/<div id="root">\s*<div class="boot-splash">/);
  });

  it("when the splash page is read, should apply the saved theme before painting", () => {
    expect(read("splash.html")).toContain('src="/theme-init.js"');
  });

  it("when the splash page is read, should load the app stylesheet as a link so the first paint is styled", () => {
    expect(read("splash.html")).toContain('<link rel="stylesheet" href="/src/global.css" />');
  });

  it.each(["splash.html", "index.html"])(
    "when %s is read, should have critical inline CSS for the theme background",
    (file) => {
      const html = read(file);

      expect(html).toContain("html { background: #f1f1f1; }");
      expect(html).toContain("html.dark { background: #1b1b1b; }");
    },
  );

  it("when the main build is configured, should emit the splash page next to the app", () => {
    const config = fs.readFileSync(path.join(root, "..", "vite.renderer.main.config.mts"), "utf8");

    expect(config).toContain("splash.html");
  });
});
