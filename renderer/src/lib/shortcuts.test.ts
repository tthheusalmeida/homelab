import { describe, expect, it } from "vitest";

import { goShortcutLabel, GO_SHORTCUTS, isPaletteShortcut, isTypingTarget, urlForGoKey } from "./shortcuts";

describe("shortcuts", () => {
  it("when listing the go shortcuts, should use a different key for each screen", () => {
    const keys = Object.values(GO_SHORTCUTS);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("when asking for a label, should write G and the key in capitals", () => {
    expect(goShortcutLabel("/jobs/create")).toBe("G T");
    expect(goShortcutLabel("/nao-existe")).toBeUndefined();
  });

  it("when asking which screen a key opens, should ignore the case", () => {
    expect(urlForGoKey("H")).toBe("/");
    expect(urlForGoKey("z")).toBeUndefined();
  });

  it("when the focus is on a field or editable area, should be a typing target", () => {
    const input = document.createElement("input");
    const textarea = document.createElement("textarea");
    const editable = document.createElement("div");
    const box = document.createElement("div");

    Object.defineProperty(editable, "isContentEditable", { value: true });
    box.setAttribute("role", "textbox");

    expect([input, textarea, editable, box].every(isTypingTarget)).toBe(true);
    expect(isTypingTarget(document.createElement("button"))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });

  it("when Ctrl or Cmd is held with K, should be the palette shortcut", () => {
    expect(isPaletteShortcut(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))).toBe(true);
    expect(isPaletteShortcut(new KeyboardEvent("keydown", { key: "K", metaKey: true }))).toBe(true);
    expect(isPaletteShortcut(new KeyboardEvent("keydown", { key: "k" }))).toBe(false);
    expect(
      isPaletteShortcut(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, altKey: true })),
    ).toBe(false);
  });
});
