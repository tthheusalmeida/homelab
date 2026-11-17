import type { ReactNode } from "react";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppearanceProvider } from "#components/AppearanceProvider";
import { APPEARANCE_CACHE_KEY } from "#lib/appearance";
import { IpcChannels } from "#shared/channels";
import { DEFAULT_APPEARANCE } from "#shared/contracts/appearance";
import { DEFAULT_READING } from "#shared/contracts/reading";
import { failure, mockApi, ok } from "#test/api-mock";

import { useAppearance, useReadingPreferences } from "./use-appearance";

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppearanceProvider>{children}</AppearanceProvider>
);

class FakeChannel {
  static instances: FakeChannel[] = [];
  static posted: unknown[] = [];
  onmessage: ((event: { data: unknown }) => void) | null = null;

  constructor() {
    FakeChannel.instances.push(this);
  }

  postMessage(data: unknown) {
    FakeChannel.posted.push(data);
  }

  close() {
    FakeChannel.instances = FakeChannel.instances.filter((own) => own !== this);
  }
}

function stubSystemTheme(dark: boolean) {
  const listeners = new Set<() => void>();
  const query = {
    matches: dark,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  };

  window.matchMedia = vi.fn(() => query) as unknown as typeof window.matchMedia;

  return {
    change(next: boolean) {
      query.matches = next;
      listeners.forEach((listener) => listener());
    },
  };
}

describe("useAppearance", () => {
  beforeEach(() => {
    localStorage.clear();
    FakeChannel.instances = [];
    FakeChannel.posted = [];
    vi.stubGlobal("BroadcastChannel", FakeChannel);
    stubSystemTheme(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-accent");
  });

  it("when used outside the provider, should fail with a clear message", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() => renderHook(() => useAppearance())).toThrow(/AppearanceProvider/);

    spy.mockRestore();
  });

  it("when nothing is cached or saved, should start with the system theme and the cyan accent", async () => {
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: "system", accent: "cyan" }) });

    const { result } = renderHook(() => useAppearance(), { wrapper });

    await waitFor(() => expect(document.documentElement.dataset.accent).toBe("cyan"));
    expect(result.current.appearance).toEqual({ theme: "system", accent: "cyan", reading: DEFAULT_READING });
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("when the main answers a saved appearance, should apply it and cache it", async () => {
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: "dark", accent: "violet" }) });

    renderHook(() => useAppearance(), { wrapper });

    await waitFor(() => expect(document.documentElement.dataset.accent).toBe("violet"));
    expect(document.documentElement).toHaveClass("dark");
    expect(JSON.parse(localStorage.getItem(APPEARANCE_CACHE_KEY)!)).toEqual({
      theme: "dark",
      accent: "violet",
      reading: DEFAULT_READING,
    });
  });

  it("when the theme is system and the system turns dark, should follow it", async () => {
    const system = stubSystemTheme(false);
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: "system", accent: "cyan" }) });

    renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(document.documentElement.dataset.accent).toBe("cyan"));

    act(() => system.change(true));

    await waitFor(() => expect(document.documentElement).toHaveClass("dark"));
  });

  it("when updating, should apply right away, save through ipc and tell the other windows", async () => {
    const invoke = mockApi({
      [IpcChannels.appearance.get]: () => ok({ theme: "system", accent: "cyan" }),
      [IpcChannels.appearance.update]: () => ok({ theme: "system", accent: "rose" }),
    });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(invoke).toHaveBeenCalledWith(IpcChannels.appearance.get));

    await act(async () => {
      await result.current.update({ accent: "rose" });
    });

    expect(document.documentElement.dataset.accent).toBe("rose");
    expect(invoke).toHaveBeenCalledWith(IpcChannels.appearance.update, { accent: "rose" });
    expect(FakeChannel.posted).toEqual([{ theme: "system", accent: "rose", reading: DEFAULT_READING }]);
  });

  it("when the save fails, should go back to the previous appearance and reject", async () => {
    mockApi({
      [IpcChannels.appearance.get]: () => ok({ theme: "light", accent: "blue" }),
      [IpcChannels.appearance.update]: () => failure("VALIDATION", "Escolha uma cor válida."),
    });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(document.documentElement.dataset.accent).toBe("blue"));

    await act(async () => {
      await expect(result.current.update({ accent: "orange" })).rejects.toThrow(/cor válida/);
    });

    expect(result.current.appearance).toEqual({ theme: "light", accent: "blue", reading: DEFAULT_READING });
    expect(document.documentElement.dataset.accent).toBe("blue");
  });

  it("when another window announces a change, should adopt it", async () => {
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: "system", accent: "cyan" }) });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(FakeChannel.instances).toHaveLength(1));

    act(() => {
      FakeChannel.instances[0].onmessage?.({ data: { theme: "dark", accent: "emerald" } });
    });

    expect(result.current.appearance).toEqual({ theme: "dark", accent: "emerald", reading: DEFAULT_READING });
    expect(document.documentElement).toHaveClass("dark");
  });

  it("when another window sends something invalid, should ignore it", async () => {
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: "system", accent: "cyan" }) });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(FakeChannel.instances).toHaveLength(1));

    act(() => {
      FakeChannel.instances[0].onmessage?.({ data: { theme: "sepia" } });
    });

    expect(result.current.appearance.theme).toBe("system");
  });

  it("when the window gets focus again, should read the saved appearance once more", async () => {
    let saved = { theme: "system", accent: "cyan" };
    mockApi({ [IpcChannels.appearance.get]: () => ok(saved) });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.appearance.accent).toBe("cyan"));

    saved = { theme: "system", accent: "indigo" };
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(result.current.appearance.accent).toBe("indigo"));
  });

  it("when resetting, should save the default appearance", async () => {
    const invoke = mockApi({
      [IpcChannels.appearance.get]: () => ok({ theme: "dark", accent: "rose" }),
      [IpcChannels.appearance.update]: () => ok({ theme: "system", accent: "cyan" }),
    });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.appearance.accent).toBe("rose"));

    await act(async () => {
      await result.current.reset();
    });

    expect(invoke).toHaveBeenCalledWith(
      IpcChannels.appearance.update,
      DEFAULT_APPEARANCE,
    );
    expect(result.current.appearance).toEqual(DEFAULT_APPEARANCE);
  });

  it("when only part of the reading preferences is updated, should keep the others and send just the change", async () => {
    const invoke = mockApi({
      [IpcChannels.appearance.get]: () =>
        ok({ ...DEFAULT_APPEARANCE, reading: { ...DEFAULT_READING, font: "lora" } }),
      [IpcChannels.appearance.update]: () =>
        ok({
          ...DEFAULT_APPEARANCE,
          reading: { ...DEFAULT_READING, font: "lora", fontSize: 18 },
        }),
    });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.appearance.reading.font).toBe("lora"));

    await act(async () => {
      await result.current.updateReading({ fontSize: 18 });
    });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.appearance.update, {
      reading: { fontSize: 18 },
    });
    expect(result.current.appearance.reading).toEqual({
      ...DEFAULT_READING,
      font: "lora",
      fontSize: 18,
    });
  });

  it("when a reading update is applied before the answer, should show it right away", async () => {
    let answer: (value: unknown) => void = () => undefined;
    mockApi({
      [IpcChannels.appearance.get]: () => ok(DEFAULT_APPEARANCE),
      [IpcChannels.appearance.update]: () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
    });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.appearance.reading.zoom).toBe(100));

    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.updateReading({ zoom: 120 });
    });

    expect(result.current.appearance.reading.zoom).toBe(120);

    await act(async () => {
      answer(ok({ ...DEFAULT_APPEARANCE, reading: { ...DEFAULT_READING, zoom: 120 } }));
      await pending;
    });
  });

  it("when a reading update fails, should go back to the previous preferences and report the error", async () => {
    mockApi({
      [IpcChannels.appearance.get]: () => ok(DEFAULT_APPEARANCE),
      [IpcChannels.appearance.update]: () => failure("VALIDATION", "Tamanho inválido."),
    });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.appearance.reading.fontSize).toBe(16));

    await act(async () => {
      await expect(result.current.updateReading({ fontSize: 18 })).rejects.toThrow(
        "Tamanho inválido.",
      );
    });

    expect(result.current.appearance.reading.fontSize).toBe(16);
  });

  it("when resetting the reading, should save the default reading and keep theme and accent", async () => {
    const invoke = mockApi({
      [IpcChannels.appearance.get]: () =>
        ok({
          theme: "dark",
          accent: "rose",
          reading: { ...DEFAULT_READING, background: "amber" },
        }),
      [IpcChannels.appearance.update]: () =>
        ok({ theme: "dark", accent: "rose", reading: DEFAULT_READING }),
    });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(result.current.appearance.reading.background).toBe("amber"));

    await act(async () => {
      await result.current.resetReading();
    });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.appearance.update, {
      reading: DEFAULT_READING,
    });
    expect(result.current.appearance).toEqual({
      theme: "dark",
      accent: "rose",
      reading: DEFAULT_READING,
    });
  });
});

describe("useReadingPreferences", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("when used outside the provider, should answer the defaults and no way to save", () => {
    const { result } = renderHook(() => useReadingPreferences());

    expect(result.current.reading).toEqual(DEFAULT_READING);
    expect(result.current.updateReading).toBeNull();
  });

  it("when the saved theme is dark, should tell it is dark", async () => {
    mockApi({
      [IpcChannels.appearance.get]: () => ok({ ...DEFAULT_APPEARANCE, theme: "dark" }),
    });

    const { result } = renderHook(() => useReadingPreferences(), { wrapper });

    await waitFor(() => expect(result.current.dark).toBe(true));
  });

  it("when the theme is system and the system turns dark, should follow it", async () => {
    const system = stubSystemTheme(false);
    mockApi({ [IpcChannels.appearance.get]: () => ok(DEFAULT_APPEARANCE) });

    const { result } = renderHook(() => useReadingPreferences(), { wrapper });
    expect(result.current.dark).toBe(false);

    act(() => system.change(true));

    await waitFor(() => expect(result.current.dark).toBe(true));
  });
});
