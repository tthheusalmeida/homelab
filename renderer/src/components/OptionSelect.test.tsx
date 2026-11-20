import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OptionSelect } from "./OptionSelect";

const options = [
  { id: "all", label: "Todos" },
  { id: "a", label: "A" },
];

const trigger = () => screen.getByRole("combobox");

describe("OptionSelect", () => {
  it("when no choice is active, should look like the default (no highlight)", () => {
    render(<OptionSelect value="all" options={options} placeholder="Tipo" onValueChange={vi.fn()} />);

    expect(trigger()).not.toHaveAttribute("data-active");
    expect(trigger().className).toContain("bg-muted/50");
    expect(trigger().className).not.toContain("ring-primary");
  });

  it("when a choice is active, should use the accent color with a thin ring", () => {
    render(<OptionSelect value="a" active options={options} placeholder="Tipo" onValueChange={vi.fn()} />);

    expect(trigger()).toHaveAttribute("data-active", "true");
    expect(trigger().className).toContain("bg-primary/15");
    expect(trigger().className).toContain("text-brand-text");
    expect(trigger().className).toContain("ring-primary/50");
    expect(trigger().className).toContain("dark:bg-primary/20");
  });

  it("when active, should keep the width and the height of the button", () => {
    render(
      <OptionSelect value="a" active triggerWidth="w-40" options={options} placeholder="Tipo" onValueChange={vi.fn()} />,
    );

    expect(trigger()).toHaveClass("h-8", "w-40");
  });

  it("when opened, should drop down below the button instead of covering it with the chosen item", async () => {
    render(<OptionSelect value="a" options={options} placeholder="Tipo" onValueChange={vi.fn()} />);

    await userEvent.click(trigger());

    const popup = await screen.findByRole("listbox");
    const content = popup.closest('[data-slot="select-content"]') as HTMLElement;

    expect(content).toHaveAttribute("data-align-trigger", "false");
    expect(content).toHaveClass("transition-opacity", "data-starting-style:opacity-0");
    expect(content.className).not.toMatch(/zoom|slide/);
    expect(content.parentElement).toHaveAttribute("data-side", "bottom");
  });

  it("when showing the chosen option, should show its label", () => {
    render(<OptionSelect value="a" active options={options} placeholder="Tipo" onValueChange={vi.fn()} />);

    expect(trigger()).toHaveTextContent("A");
  });
});
