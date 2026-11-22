import { useState } from "react";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FindBar } from "#components/FindBar";

import { useFind } from "./use-find";

function Host() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const find = useFind(container);

  return (
    <>
      {find.open && <FindBar floating {...find.barProps} onClose={find.close} />}
      <div ref={setContainer}>
        <p>A casa da vida e outra casa.</p>
      </div>
    </>
  );
}

describe("useFind", () => {
  beforeEach(() => {
    Element.prototype.scrollIntoView = vi.fn();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  });

  it("when Ctrl+F is pressed, should open the bar and focus the field", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host />);

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

    await user.keyboard("{Control>}f{/Control}");

    expect(screen.getByRole("searchbox")).toHaveFocus();
  });

  it("when Ctrl+F is pressed, should keep the browser from taking the shortcut", () => {
    renderHook(() => useFind(null));
    const event = new KeyboardEvent("keydown", {
      key: "f",
      ctrlKey: true,
      cancelable: true,
    });

    document.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("when typing a phrase, should count its occurrences after the debounce", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host />);
    await user.keyboard("{Control>}f{/Control}");

    await user.type(screen.getByRole("searchbox"), "casa da vida");
    await act(() => vi.advanceTimersByTimeAsync(400));

    expect(screen.getByText("1 de 1")).toBeInTheDocument();
  });

  it("when Escape is pressed twice, should clear and then close the bar", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host />);
    await user.keyboard("{Control>}f{/Control}");

    await user.type(screen.getByRole("searchbox"), "casa{Escape}");

    expect(screen.getByRole("searchbox")).toHaveValue("");

    await user.keyboard("{Escape}");

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });
});
