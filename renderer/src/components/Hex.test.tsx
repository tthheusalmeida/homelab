import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HexDot, HexFrame, HexLoader, HexStepMarker, HoneycombBackdrop, hexPath, Logo } from "./Hex";

describe("hexPath", () => {
  it("when given a center and radius, should draw six corners with the tip pointing up", () => {
    const path = hexPath(24, 24, 10);

    expect(path.startsWith("M24.00 14.00L")).toBe(true);
    expect(path.split("L")).toHaveLength(6);
    expect(path.endsWith("Z")).toBe(true);
  });
});

describe("Logo", () => {
  it("when rendered, should draw three hexagons with only one in the accent color", () => {
    const { container } = render(<Logo />);
    const cells = container.querySelectorAll("path");

    expect(cells).toHaveLength(3);
    expect([...cells].filter((cell) => cell.classList.contains("fill-brand"))).toHaveLength(1);
    expect([...cells].filter((cell) => cell.classList.contains("fill-foreground"))).toHaveLength(2);
  });

  it("when rendered, should be decorative for screen readers", () => {
    const { container } = render(<Logo />);

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("HexLoader", () => {
  it("when rendered, should be announced with its label and use the accent color", () => {
    render(<HexLoader label="Carregando livros" />);

    expect(screen.getByRole("img", { name: "Carregando livros" })).toHaveClass("text-brand");
  });

  it("when rendered, should paint the three hexagons with the current color", () => {
    const { container } = render(<HexLoader />);

    expect(container.querySelectorAll("path.fill-current")).toHaveLength(3);
  });
});

describe("HexDot", () => {
  it("when given a color class, should apply it to the hexagon", () => {
    const { container } = render(<HexDot className="bg-emerald-500" />);

    expect(container.firstElementChild).toHaveClass("bg-emerald-500");
  });

  it("when pulse is on, should animate", () => {
    const { container } = render(<HexDot pulse />);

    expect(container.firstElementChild).toHaveClass("animate-pulse");
  });

  it("when pulse is off, should stay still", () => {
    const { container } = render(<HexDot />);

    expect(container.firstElementChild).not.toHaveClass("animate-pulse");
  });
});

describe("HexFrame", () => {
  it("when given an icon, should show it inside the hexagon outline", () => {
    const { container } = render(
      <HexFrame>
        <span>ícone</span>
      </HexFrame>,
    );

    expect(screen.getByText("ícone")).toBeInTheDocument();
    expect(container.querySelector("svg path")).toHaveAttribute("fill", "none");
  });
});

describe("HoneycombBackdrop", () => {
  it("when rendered, should draw twelve cells and stay out of the way", () => {
    const { container } = render(<HoneycombBackdrop />);
    const svg = container.querySelector("svg")!;

    expect(svg.querySelectorAll("path")).toHaveLength(12);
    expect(svg).toHaveClass("pointer-events-none");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});

describe("HexStepMarker", () => {
  it.each(["pending", "running", "done", "failed"] as const)(
    "when the step is %s, should expose the state for the animations and hide from screen readers",
    (state) => {
      const { container } = render(<HexStepMarker state={state} />);

      expect(container.firstElementChild).toHaveAttribute("data-state", state);
      expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
    },
  );

  it("when the step is done, should draw the border, the fill and the ring and show the check", () => {
    const { container } = render(<HexStepMarker state="done" />);

    expect(container.querySelector(".hs-border")).toHaveAttribute("pathLength", "100");
    expect(container.querySelector(".hs-fill")).not.toBeNull();
    expect(container.querySelector(".hs-ring")).not.toBeNull();
    expect(container.querySelectorAll("svg")).toHaveLength(2);
  });

  it("when the step is pending or running, should show no check", () => {
    const { container, rerender } = render(<HexStepMarker state="pending" />);

    expect(container.querySelectorAll("svg")).toHaveLength(1);

    rerender(<HexStepMarker state="running" />);

    expect(container.querySelectorAll("svg")).toHaveLength(1);
  });

  it("when the step is shown already done and animate is off, should come ready and still", () => {
    const { container } = render(<HexStepMarker state="done" animate={false} />);

    expect(container.firstElementChild).toHaveAttribute("data-static", "true");
    expect(container.querySelector("svg.animate-enter-scale")).toBeNull();
  });

  it("when animate is not set, should animate the check in", () => {
    const { container } = render(<HexStepMarker state="done" />);

    expect(container.firstElementChild).toHaveAttribute("data-static", "false");
    expect(container.querySelector("svg.animate-enter-scale")).not.toBeNull();
  });

  it("when the step failed, should show the cross", () => {
    const { container } = render(<HexStepMarker state="failed" />);

    expect(container.querySelectorAll("svg")).toHaveLength(2);
    expect(container.querySelector("svg path[d*=\"M6 6\"]")).not.toBeNull();
  });
});
