import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { MarkdownMessage } from "./MarkdownMessage";

describe("MarkdownMessage — formulas", () => {
  it("when the text has an inline formula, should draw it instead of showing the dollars", () => {
    const { container } = render(
      <MarkdownMessage content={"Termos ($F_1 = 1, F_2 = 1$) iguais."} />,
    );

    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container).not.toHaveTextContent("$");
    expect(container).toHaveTextContent("iguais.");
  });

  it("when the formula is on its own lines between double dollars, should draw it as a block", () => {
    const { container } = render(
      <MarkdownMessage content={"Antes\n\n$$\nF_n = F_{n-1} + F_{n-2}\n$$\n\nDepois"} />,
    );

    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("when the double-dollar formula is written on a single line, should draw it as a block", () => {
    const { container } = render(
      <MarkdownMessage content={"Antes\n\n$$\\int_0^1 x\\,dx = \\frac{1}{2}$$\n\nDepois"} />,
    );

    expect(container.querySelector(".katex-display")).not.toBeNull();
  });

  it("when a block formula comes before a heading, should still give the heading its id", () => {
    const { container } = render(
      <MarkdownMessage content={"$$x^2$$\n\n## Depois"} headingIds />,
    );

    expect(container.querySelector("h2")).toHaveAttribute("id", "depois");
  });

  it("when the formula is invalid, should keep the page and mark the error", () => {
    const { container } = render(
      <MarkdownMessage content={String.raw`Veja $\frac{a$ aqui`} />,
    );

    expect(container.querySelector(".katex-error")).not.toBeNull();
    expect(container).toHaveTextContent("Veja");
  });

  it("when the money dollar is escaped, should show the dollar and no formula", () => {
    const { container } = render(
      <MarkdownMessage content={String.raw`Custa R\$ 10 e R\$ 20.`} />,
    );

    expect(container.querySelector(".katex")).toBeNull();
    expect(container).toHaveTextContent("Custa R$ 10 e R$ 20.");
  });

  it("when a shell variable is inside code, should leave the dollar alone", () => {
    const { container } = render(
      <MarkdownMessage content={"Rode `echo $HOME` e `echo $PATH`."} />,
    );

    expect(container.querySelector(".katex")).toBeNull();
    expect(container).toHaveTextContent("echo $HOME");
  });
});
