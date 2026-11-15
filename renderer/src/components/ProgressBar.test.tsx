import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("when the total is known, should expose the rounded percentage and fill the bar to it", () => {
    render(<ProgressBar value={1} total={3} label="Copiando" />);

    const bar = screen.getByRole("progressbar", { name: "Copiando" });

    expect(bar).toHaveAttribute("aria-valuenow", "33");
    expect(bar.firstElementChild).toHaveStyle({ width: "33%" });
  });

  it("when everything was processed, should be full", () => {
    render(<ProgressBar value={5} total={5} label="Copiando" />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("when the value passes the total, should never go above 100%", () => {
    render(<ProgressBar value={9} total={5} label="Copiando" />);

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("when the total is still unknown, should be indeterminate (no value announced)", () => {
    render(<ProgressBar value={0} total={0} label="Preparando" />);

    const bar = screen.getByRole("progressbar", { name: "Preparando" });

    expect(bar).not.toHaveAttribute("aria-valuenow");
    expect(bar.firstElementChild).toHaveClass("animate-pulse");
  });
});
