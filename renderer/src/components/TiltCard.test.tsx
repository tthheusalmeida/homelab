import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

import { TILT_GROUP_ATTRIBUTE, TiltCard } from "./TiltCard";

/** `getBoundingClientRect` falso: o jsdom devolve tudo zerado. */
function size(element: Element, width = 100, height = 200) {
  element.getBoundingClientRect = () =>
    ({ left: 0, top: 0, right: width, bottom: height, width, height, x: 0, y: 0 }) as DOMRect;
}

const flush = () => act(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));

function setup(grouped = false, maxTilt = 10) {
  const { unmount } = render(
    <div {...(grouped ? { [TILT_GROUP_ATTRIBUTE]: "" } : {})} data-testid="host">
      <TiltCard maxTilt={maxTilt}>
        <span>capa</span>
      </TiltCard>
    </div>,
  );

  const card = document.querySelector<HTMLElement>("[data-slot=tilt-card]")!;

  size(card);

  return { card, host: screen.getByTestId("host"), unmount };
}

const move = (target: Element, clientX: number, clientY: number, pointerType = "mouse") =>
  fireEvent(
    target,
    Object.assign(new MouseEvent("pointermove", { clientX, clientY, bubbles: true }), {
      pointerType,
    }),
  );

describe("TiltCard", () => {
  afterEach(() => vi.restoreAllMocks());

  it("when nothing hovers it, should stay normal (no tilt, no hover mark, glare hidden)", () => {
    const { card } = setup();

    expect(card.dataset.hovering).toBeUndefined();
    expect(card.style.getPropertyValue("--tilt-x")).toBe("");
    expect(card.style.getPropertyValue("--tilt-y")).toBe("");
    expect(card.querySelector("[data-slot=tilt-glare]")).toHaveClass("opacity-0");
  });

  it("when the pointer moves over it, should mark it as hovering and tilt toward the pointer", async () => {
    const { card } = setup();

    move(card, 100, 0);
    await flush();

    expect(card.dataset.hovering).toBe("true");
    expect(card.style.getPropertyValue("--tilt-y")).toBe("10.00deg");
    expect(card.style.getPropertyValue("--tilt-x")).toBe("10.00deg");
  });

  it("when the pointer is at the center, should not tilt", async () => {
    const { card } = setup();

    move(card, 50, 100);
    await flush();

    expect(card.style.getPropertyValue("--tilt-x")).toBe("0.00deg");
    expect(card.style.getPropertyValue("--tilt-y")).toBe("0.00deg");
  });

  it("when the pointer is at the bottom left, should tilt the other way", async () => {
    const { card } = setup();

    move(card, 0, 200);
    await flush();

    expect(card.style.getPropertyValue("--tilt-x")).toBe("-10.00deg");
    expect(card.style.getPropertyValue("--tilt-y")).toBe("-10.00deg");
  });

  it("when a different max tilt is given, should scale the angles to it", async () => {
    const { card } = setup(false, 4);

    move(card, 100, 100);
    await flush();

    expect(card.style.getPropertyValue("--tilt-y")).toBe("4.00deg");
    expect(card.style.getPropertyValue("--tilt-x")).toBe("0.00deg");
  });

  it("when the pointer moves, should make the glare follow it", async () => {
    const { card } = setup();

    move(card, 25, 50);
    await flush();

    expect(card.style.getPropertyValue("--glare-x")).toBe("25.0%");
    expect(card.style.getPropertyValue("--glare-y")).toBe("25.0%");
  });

  it("when the pointer is outside the content (over the card text), should clamp the tilt to the edge", async () => {
    const { card } = setup();

    move(card, 500, -300);
    await flush();

    expect(card.style.getPropertyValue("--tilt-y")).toBe("10.00deg");
    expect(card.style.getPropertyValue("--tilt-x")).toBe("10.00deg");
  });

  it("when the pointer leaves, should go back to normal", async () => {
    const { card } = setup();

    move(card, 100, 0);
    await flush();
    fireEvent(card, new MouseEvent("pointerleave"));

    expect(card.dataset.hovering).toBeUndefined();
    expect(card.style.getPropertyValue("--tilt-x")).toBe("");
    expect(card.style.getPropertyValue("--glare-x")).toBe("");
  });

  it("when the pointer is cancelled, should go back to normal", async () => {
    const { card } = setup();

    move(card, 100, 0);
    await flush();
    fireEvent(card, new MouseEvent("pointercancel"));

    expect(card.dataset.hovering).toBeUndefined();
  });

  it("when the pointer is a finger (touch), should ignore it", async () => {
    const { card } = setup();

    move(card, 100, 0, "touch");
    await flush();

    expect(card.dataset.hovering).toBeUndefined();
  });

  it("when the content has no size yet, should not tilt", async () => {
    const { card } = setup();

    size(card, 0, 0);
    move(card, 10, 10);
    await flush();

    expect(card.dataset.hovering).toBeUndefined();
  });

  it("when it sits inside a tilt group, should react to the pointer over the whole group (like the link that covers the card)", async () => {
    const { card, host } = setup(true);

    move(host, 100, 0);
    await flush();

    expect(card.dataset.hovering).toBe("true");

    fireEvent(host, new MouseEvent("pointerleave"));

    expect(card.dataset.hovering).toBeUndefined();
  });

  it("when it is not in a group, should not react to the pointer over its parent", async () => {
    const { card, host } = setup(false);

    move(host, 100, 0);
    await flush();

    expect(card.dataset.hovering).toBeUndefined();
  });

  it("when the user prefers reduced motion, should never tilt", async () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) => ({ matches: query.includes("reduce"), media: query }) as MediaQueryList,
    );

    const { card } = setup();

    move(card, 100, 0);
    await flush();

    expect(card.dataset.hovering).toBeUndefined();
  });

  it("when unmounted, should stop listening to the group pointer events", () => {
    const { host, unmount } = setup(true);
    const remove = vi.spyOn(host, "removeEventListener");

    unmount();

    expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("pointerleave", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("pointercancel", expect.any(Function));
  });

  it("when rendered, should show its content", () => {
    setup();

    expect(screen.getByText("capa")).toBeInTheDocument();
  });
});
