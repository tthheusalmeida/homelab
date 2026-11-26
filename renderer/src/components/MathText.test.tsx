import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MathText } from "./MathText";

describe("MathText", () => {
  it("when the text has no formula, should show it as is", () => {
    const { container } = render(<MathText>Camada de transporte</MathText>);

    expect(container).toHaveTextContent("Camada de transporte");
    expect(container.querySelector(".katex")).toBeNull();
  });

  it("when the text has a formula, should draw it with KaTeX and keep the prose", () => {
    const { container } = render(
      <MathText>{"termos $F_n = F_{n-1}$ da sequência"}</MathText>,
    );

    expect(container.querySelector(".katex")).not.toBeNull();
    expect(container).toHaveTextContent("termos");
    expect(container).toHaveTextContent("da sequência");
    expect(container).not.toHaveTextContent("$");
  });

  it("when the formula is invalid, should not throw and should still show something", () => {
    const { container } = render(<MathText>{String.raw`$\frac{a$`}</MathText>);

    expect(container.querySelector(".katex-error")).not.toBeNull();
  });

  it("when the dollars are money, should not draw a formula", () => {
    const { container } = render(<MathText>{"custa R$ 10 e R$ 20"}</MathText>);

    expect(container.querySelector(".katex")).toBeNull();
    expect(screen.getByText("custa R$ 10 e R$ 20")).toBeInTheDocument();
  });

  it("when the dollar is escaped, should show a plain dollar", () => {
    const { container } = render(<MathText>{String.raw`vale R\$ 5`}</MathText>);

    expect(container).toHaveTextContent("vale R$ 5");
  });
});
