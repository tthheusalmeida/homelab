import { useState } from "react";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { FindBar } from "#components/FindBar";

import { useFind } from "./use-find";

function Host() {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const find = useFind(container);

  return (
    <>
      {find.open && (
        <FindBar {...find.barProps} results={find.results} onClose={find.close} />
      )}
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

  it("when a result is picked, should close the bar and clear the search after 1 second", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host />);

    await user.keyboard("{Control>}f{/Control}");
    await user.type(screen.getByRole("searchbox"), "casa");
    await act(() => vi.advanceTimersByTimeAsync(400));
    await user.click(
      within(screen.getByRole("list", { name: "Resultados da pesquisa" })).getAllByRole("button")[1],
    );

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();

    await act(() => vi.advanceTimersByTimeAsync(1300));
    await user.keyboard("{Control>}f{/Control}");

    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("when a result is picked, should fade the mark out during the last 300 ms", async () => {
    const cancel = vi.fn();
    const animate = vi.fn(() => ({ cancel }));
    Element.prototype.animate = animate as never;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host />);

    await user.keyboard("{Control>}f{/Control}");
    await user.type(screen.getByRole("searchbox"), "casa");
    await act(() => vi.advanceTimersByTimeAsync(400));
    await user.click(
      within(screen.getByRole("list", { name: "Resultados da pesquisa" })).getAllByRole("button")[0],
    );
    await act(() => vi.advanceTimersByTimeAsync(250 + 600));

    expect(animate).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(150));

    expect(animate).toHaveBeenCalledWith(
      { "--find-alpha": [1, 0] },
      expect.objectContaining({ duration: 300 }),
    );

    await user.keyboard("{Control>}f{/Control}");

    expect(cancel).toHaveBeenCalled();
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it("when the page is still scrolling to the picked result, should not start fading until it arrives", async () => {
    const animate = vi.fn(() => ({ cancel: vi.fn() }));
    Element.prototype.animate = animate as never;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host />);

    await user.keyboard("{Control>}f{/Control}");
    await user.type(screen.getByRole("searchbox"), "casa");
    await act(() => vi.advanceTimersByTimeAsync(400));
    await user.click(
      within(screen.getByRole("list", { name: "Resultados da pesquisa" })).getAllByRole("button")[0],
    );

    for (let i = 0; i < 30; i += 1) {
      await act(() => vi.advanceTimersByTimeAsync(100));
      document.dispatchEvent(new Event("scroll"));
    }

    expect(animate).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(120 + 750));

    expect(animate).toHaveBeenCalled();
    delete (Element.prototype as { animate?: unknown }).animate;
  });

  it("when Ctrl+F is pressed right after picking a result, should keep the search text", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Host />);

    await user.keyboard("{Control>}f{/Control}");
    await user.type(screen.getByRole("searchbox"), "casa");
    await act(() => vi.advanceTimersByTimeAsync(400));
    await user.click(
      within(screen.getByRole("list", { name: "Resultados da pesquisa" })).getAllByRole("button")[0],
    );
    await user.keyboard("{Control>}f{/Control}");
    await act(() => vi.advanceTimersByTimeAsync(1500));

    expect(screen.getByRole("searchbox")).toHaveValue("casa");
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
