import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { Button } from "./button";

describe("Button", () => {
  it("when not loading, should render the label only and stay enabled", () => {
    render(<Button>Salvar</Button>);

    const button = screen.getByRole("button", { name: "Salvar" });

    expect(button).toBeEnabled();
    expect(button.querySelector("svg")).toBeNull();
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("when loading, should show the spinner before the label, disable it and mark it busy", () => {
    render(<Button loading>Salvar</Button>);

    const button = screen.getByRole("button", { name: "Salvar" });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button.firstElementChild?.tagName.toLowerCase()).toBe("svg");
    expect(button.firstElementChild).toHaveClass("animate-spin");
  });

  it("when disabled and not loading, should stay disabled without spinner", () => {
    render(<Button disabled>Salvar</Button>);

    expect(screen.getByRole("button")).toBeDisabled();
    expect(screen.getByRole("button").querySelector("svg")).toBeNull();
  });
});
