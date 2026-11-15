import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileText, Rows3 } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { MarkdownMessage } from "./MarkdownMessage";
import { OptionToggle } from "./OptionToggle";
import { PaperPage } from "./PaperPage";

const options = [
  { id: "frames", label: "Quadros", icon: Rows3 },
  { id: "pages", label: "Páginas", icon: FileText },
] as const;

describe("OptionToggle", () => {
  it("when rendered, should name the group and mark only the current option as pressed", () => {
    render(
      <OptionToggle
        label="Visualização do livro"
        options={options}
        value="pages"
        onChange={() => undefined}
      />,
    );

    expect(
      screen.getByRole("group", { name: "Visualização do livro" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Páginas" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Quadros" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("when an option is clicked, should tell which one was chosen", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <OptionToggle label="x" options={options} value="frames" onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Páginas" }));

    expect(onChange).toHaveBeenCalledWith("pages");
  });
});

describe("PaperPage sheet", () => {
  it("when the card variant is used (default), should keep the theme card", () => {
    const { container } = render(<PaperPage>texto</PaperPage>);

    expect(container.firstElementChild).toHaveClass("bg-card");
    expect(container.firstElementChild).not.toHaveAttribute("data-variant");
  });

  it("when the sheet variant is used, should look like paper with dark ink and a serif font", () => {
    const { container } = render(<PaperPage variant="sheet">texto</PaperPage>);

    expect(container.firstElementChild).toHaveAttribute("data-variant", "sheet");
    expect(container.firstElementChild).toHaveClass(
      "paper-sheet",
      "font-serif",
      "text-stone-900",
    );
  });

  it("when a page number is given, should print it at the bottom of the sheet", () => {
    render(
      <PaperPage variant="sheet" pageNumber="Capítulo 3">
        texto
      </PaperPage>,
    );

    expect(screen.getByText("Capítulo 3")).toBeInTheDocument();
  });

  it("when no page number is given, should print nothing at the bottom", () => {
    const { container } = render(<PaperPage variant="sheet">texto</PaperPage>);

    expect(container.querySelector("p")).toBeNull();
  });
});

describe("MarkdownMessage tone", () => {
  it("when the tone is the theme (default), should invert the colors in the dark theme", () => {
    const { container } = render(<MarkdownMessage content="oi" />);

    expect(container.querySelector(".prose")).toHaveClass("dark:prose-invert");
  });

  it("when the tone is paper, should use dark ink instead of inverting", () => {
    const { container } = render(<MarkdownMessage content="oi" tone="paper" />);

    expect(container.querySelector(".prose")).toHaveClass("prose-stone");
    expect(container.querySelector(".prose")).not.toHaveClass("dark:prose-invert");
  });
});
