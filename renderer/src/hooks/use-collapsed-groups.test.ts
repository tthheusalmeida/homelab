import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { COLLAPSED_GROUPS_KEY, useCollapsedGroups } from "./use-collapsed-groups";

describe("useCollapsedGroups", () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("when nothing was saved, should start with every group open", () => {
    const { result } = renderHook(() => useCollapsedGroups());

    expect([...result.current[0]]).toEqual([]);
  });

  it("when a group is toggled, should collapse it, save it and open it again on the next toggle", () => {
    const { result } = renderHook(() => useCollapsedGroups());

    act(() => result.current[1]("IA"));
    expect(result.current[0].has("IA")).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(COLLAPSED_GROUPS_KEY) ?? "[]")).toEqual(["IA"]);

    act(() => result.current[1]("IA"));
    expect(result.current[0].has("IA")).toBe(false);
    expect(JSON.parse(window.localStorage.getItem(COLLAPSED_GROUPS_KEY) ?? "[]")).toEqual([]);
  });

  it("when several groups are collapsed, should keep all of them", () => {
    const { result } = renderHook(() => useCollapsedGroups());

    act(() => result.current[1]("IA"));
    act(() => result.current[1]("Tarefas"));

    expect([...result.current[0]].sort()).toEqual(["IA", "Tarefas"]);
  });

  it("when the app is opened again, should restore the groups that were collapsed", () => {
    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(["Biblioteca"]));

    const { result } = renderHook(() => useCollapsedGroups());

    expect(result.current[0].has("Biblioteca")).toBe(true);
    expect(result.current[0].has("IA")).toBe(false);
  });

  it.each([
    ["not JSON", "isto não é json"],
    ["not a list", JSON.stringify({ IA: true })],
  ])("when the saved value is %s, should open everything", (_label, saved) => {
    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, saved);

    const { result } = renderHook(() => useCollapsedGroups());

    expect([...result.current[0]]).toEqual([]);
  });

  it("when the saved list has other types, should keep only the texts", () => {
    window.localStorage.setItem(COLLAPSED_GROUPS_KEY, JSON.stringify(["IA", 3, null]));

    const { result } = renderHook(() => useCollapsedGroups());

    expect([...result.current[0]]).toEqual(["IA"]);
  });

  it("when the storage is unavailable, should still work during the session", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });

    const { result } = renderHook(() => useCollapsedGroups());

    expect([...result.current[0]]).toEqual([]);

    act(() => result.current[1]("IA"));

    expect(result.current[0].has("IA")).toBe(true);
  });
});
