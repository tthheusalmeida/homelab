import type { ReactNode } from "react";

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppearanceProvider } from "#components/AppearanceProvider";
import { APPEARANCE_CACHE_KEY } from "#lib/appearance";
import { IpcChannels } from "#shared/channels";
import { failure, mockApi, ok } from "#test/api-mock";

import { useAppearance } from "./use-appearance";

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
    expect(result.current.appearance).toEqual({ theme: "system", accent: "cyan" });
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
    expect(FakeChannel.posted).toEqual([{ theme: "system", accent: "rose" }]);
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

    expect(result.current.appearance).toEqual({ theme: "light", accent: "blue" });
    expect(document.documentElement.dataset.accent).toBe("blue");
  });

  it("when another window announces a change, should adopt it", async () => {
    mockApi({ [IpcChannels.appearance.get]: () => ok({ theme: "system", accent: "cyan" }) });
    const { result } = renderHook(() => useAppearance(), { wrapper });
    await waitFor(() => expect(FakeChannel.instances).toHaveLength(1));

    act(() => {
      FakeChannel.instances[0].onmessage?.({ data: { theme: "dark", accent: "emerald" } });
    });

    expect(result.current.appearance).toEqual({ theme: "dark", accent: "emerald" });
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

    expect(invoke).toHaveBeenCalledWith(IpcChannels.appearance.update, {
      theme: "system",
      accent: "cyan",
    });
    expect(result.current.appearance).toEqual({ theme: "system", accent: "cyan" });
  });
});
