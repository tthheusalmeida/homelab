import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useNow } from "./use-now";

describe("useNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T10:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("when time passes, should update every interval", () => {
    const { result } = renderHook(() => useNow(1000));
    const first = result.current;

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current - first).toBe(3000);
  });

  it("when disabled, should not tick", () => {
    const { result } = renderHook(() => useNow(1000, false));
    const first = result.current;

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current).toBe(first);
  });

  it("when unmounted, should stop the timer", () => {
    const { unmount } = renderHook(() => useNow(1000));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
