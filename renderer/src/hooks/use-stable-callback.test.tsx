import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useStableCallback } from "./use-stable-callback";

describe("useStableCallback", () => {
  it("when the component re-renders, should keep the same function identity", () => {
    const { result, rerender } = renderHook(({ fn }) => useStableCallback(fn), {
      initialProps: { fn: () => 1 },
    });
    const first = result.current;

    rerender({ fn: () => 2 });

    expect(result.current).toBe(first);
  });

  it("when the callback changes, should call the latest version with the arguments", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ fn }) => useStableCallback(fn), {
      initialProps: { fn: first },
    });

    rerender({ fn: second });
    result.current("a", 2);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("a", 2);
  });
});
