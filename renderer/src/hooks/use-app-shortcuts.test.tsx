import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router";

import { GO_SHORTCUT_TIMEOUT_MS } from "#lib/shortcuts";

import { useAppShortcuts } from "./use-app-shortcuts";

function Harness({ onOpen }: { onOpen: () => void }) {
  useAppShortcuts(onOpen);

  return (
    <>
      <p data-testid="path">{useLocation().pathname}</p>
      <input aria-label="campo" />
    </>
  );
}

const setup = () => {
  const onOpen = vi.fn();

  render(
    <MemoryRouter>
      <Harness onOpen={onOpen} />
    </MemoryRouter>,
  );

  return onOpen;
};

const press = (key: string, init: KeyboardEventInit = {}, target: Element | Window = window) =>
  fireEvent.keyDown(target, { key, ...init });

describe("useAppShortcuts", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("when Ctrl+K is pressed, should open the palette", () => {
    const onOpen = setup();

    press("k", { ctrlKey: true });

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("when Cmd+K is pressed, should open the palette", () => {
    const onOpen = setup();

    press("K", { metaKey: true });

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("when / is pressed outside a field, should open the palette", () => {
    const onOpen = setup();

    press("/");

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("when G and then T are pressed, should go to Nova tarefa", () => {
    setup();

    press("g");
    press("t");

    expect(screen.getByTestId("path")).toHaveTextContent("/jobs/create");
  });

  it.each([
    ["h", "/"],
    ["p", "/library"],
    ["l", "/library/books"],
    ["i", "/library/inbox"],
    ["n", "/library/new"],
    ["a", "/jobs/track"],
    ["c", "/ai/chat"],
    ["u", "/ai/usage"],
  ])("when G and %s are pressed, should go to %s", (key, path) => {
    setup();

    press("g");
    press(key);

    expect(screen.getByTestId("path")).toHaveTextContent(path);
  });

  it("when the second key never comes, should forget the G", () => {
    setup();

    press("g");
    act(() => {
      vi.advanceTimersByTime(GO_SHORTCUT_TIMEOUT_MS + 50);
    });
    press("t");

    expect(screen.getByTestId("path")).toHaveTextContent("/");
    expect(screen.getByTestId("path").textContent).toBe("/");
  });

  it("when G is followed by an unknown key, should do nothing and reset", () => {
    setup();

    press("g");
    press("x");
    press("t");

    expect(screen.getByTestId("path").textContent).toBe("/");
  });

  it("when typing in a field, should not trigger one-key shortcuts", () => {
    const onOpen = setup();
    const field = screen.getByLabelText("campo");

    press("/", {}, field);
    press("g", {}, field);
    press("t", {}, field);

    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByTestId("path").textContent).toBe("/");
  });

  it("when Ctrl+K is pressed inside a field, should still open the palette", () => {
    const onOpen = setup();

    press("k", { ctrlKey: true }, screen.getByLabelText("campo"));

    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("when G is pressed with Ctrl, should not start the go shortcut", () => {
    setup();

    press("g", { ctrlKey: true });
    press("t");

    expect(screen.getByTestId("path").textContent).toBe("/");
  });
});
