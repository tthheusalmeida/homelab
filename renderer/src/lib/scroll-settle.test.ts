import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { whenScrollSettles } from "./scroll-settle";

describe("whenScrollSettles", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("when nothing scrolls, should finish shortly after", () => {
    const done = vi.fn();

    whenScrollSettles(done);
    vi.advanceTimersByTime(249);

    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);

    expect(done).toHaveBeenCalledTimes(1);
  });

  it("when the page keeps scrolling, should wait until the scroll stops", () => {
    const done = vi.fn();

    whenScrollSettles(done);

    for (let i = 0; i < 10; i += 1) {
      vi.advanceTimersByTime(100);
      document.dispatchEvent(new Event("scroll"));
    }

    expect(done).not.toHaveBeenCalled();

    vi.advanceTimersByTime(120);

    expect(done).toHaveBeenCalledTimes(1);
  });

  it("when it is cancelled, should never finish", () => {
    const done = vi.fn();

    whenScrollSettles(done)();
    vi.advanceTimersByTime(10_000);

    expect(done).not.toHaveBeenCalled();
  });

  it("when the scroll never stops, should finish at the limit", () => {
    const done = vi.fn();

    whenScrollSettles(done);

    for (let i = 0; i < 90; i += 1) {
      vi.advanceTimersByTime(100);
      document.dispatchEvent(new Event("scroll"));
    }

    expect(done).toHaveBeenCalledTimes(1);
  });
});
