import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { PaperPage } from "./PaperPage";

describe("PaperPage", () => {
  it("when rendered, should show its content on a themed sheet", () => {
    render(
      <PaperPage>
        <p>texto da folha</p>
      </PaperPage>,
    );

    const sheet = screen.getByText("texto da folha").parentElement;

    expect(sheet).toHaveAttribute("data-slot", "paper-page");
    expect(sheet).toHaveClass("bg-card", "border", "max-w-3xl");
  });

  it("when rendered, should not use fixed paper colors that clash with the theme", () => {
    render(
      <PaperPage>
        <p>x</p>
      </PaperPage>,
    );

    const classes = screen.getByText("x").parentElement?.className ?? "";

    expect(classes).not.toMatch(/stone|#fff/);
  });

  it("when a className is given, should merge it and let it override the defaults", () => {
    render(
      <PaperPage className="max-w-none shadow-none">
        <p>x</p>
      </PaperPage>,
    );

    const sheet = screen.getByText("x").parentElement;

    expect(sheet).toHaveClass("max-w-none", "shadow-none");
    expect(sheet).not.toHaveClass("max-w-3xl");
  });
});

describe("PaperPage thumbnail fixed size", () => {
  it("when it is a thumbnail, should keep the 3:4 proportion and clip the content instead of growing", () => {
    const { container } = render(
      <PaperPage variant="sheet" size="thumb">
        <p>conteúdo</p>
      </PaperPage>,
    );
    const sheet = container.querySelector("[data-slot=paper-page]");

    expect(sheet).toHaveClass("aspect-[3/4]", "overflow-hidden");
    expect(sheet?.firstElementChild).toHaveClass("min-h-0", "overflow-hidden");
  });

  it("when it is the full page, should not clip it", () => {
    const { container } = render(
      <PaperPage variant="sheet">
        <p>conteúdo</p>
      </PaperPage>,
    );
    const sheet = container.querySelector("[data-slot=paper-page]");

    expect(sheet).not.toHaveClass("overflow-hidden");
    expect(sheet?.firstElementChild).not.toHaveClass("overflow-hidden");
  });
});
