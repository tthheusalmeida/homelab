import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Callout } from "./Callout";

describe("Callout", () => {
  it("when rendered, should show the message", () => {
    render(<Callout>Algo mudou.</Callout>);

    expect(screen.getByText("Algo mudou.")).toBeInTheDocument();
  });

  it("when no tone is given, should use the info tone", () => {
    const { container } = render(<Callout>texto</Callout>);

    expect(container.firstChild).toHaveAttribute("data-tone", "info");
  });

  it.each(["info", "warning", "danger"] as const)(
    "when the tone is %s, should mark it and keep the icon out of the reading order",
    (tone) => {
      const { container } = render(<Callout tone={tone}>texto</Callout>);

      expect(container.firstChild).toHaveAttribute("data-tone", tone);
      expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    },
  );

  it("when a role is given, should expose it for assistive technology", () => {
    render(
      <Callout tone="warning" role="alert">
        Cuidado
      </Callout>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Cuidado");
  });

  it("when the message is long, should let the text shrink instead of widening the layout", () => {
    render(<Callout>texto longo</Callout>);

    expect(screen.getByText("texto longo")).toHaveClass("min-w-0");
  });

  it("when a class is given, should merge it", () => {
    const { container } = render(<Callout className="mt-3">texto</Callout>);

    expect(container.firstChild).toHaveClass("mt-3");
  });
});
