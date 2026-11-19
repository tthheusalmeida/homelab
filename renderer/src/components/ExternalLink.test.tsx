import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ExternalLink } from "./ExternalLink";
import { SetupGuide } from "./SetupGuide";

describe("ExternalLink", () => {
  it("when rendered, should open the address in a new tab without leaking the opener", () => {
    render(<ExternalLink href="https://exemplo.com/x">Abrir</ExternalLink>);

    const link = screen.getByRole("link", { name: /Abrir/ });

    expect(link).toHaveAttribute("href", "https://exemplo.com/x");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("when rendered, should use the action color", () => {
    render(<ExternalLink href="https://exemplo.com">Abrir</ExternalLink>);

    expect(screen.getByRole("link")).toHaveClass("text-brand-text");
  });
});

describe("SetupGuide", () => {
  const steps = [
    { text: "Abra o painel.", link: { href: "https://exemplo.com", label: "Ir ao painel" } },
    { text: "Copie a chave." },
  ];

  it("when visible, should list the numbered steps under its title", () => {
    render(<SetupGuide title="Como criar a chave" steps={steps} visible />);

    expect(screen.getByRole("region", { name: "Como criar a chave" })).toBeVisible();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Abra o painel.")).toBeInTheDocument();
    expect(screen.getByText("Copie a chave.")).toBeInTheDocument();
  });

  it("when a step has a link, should show it as an external link", () => {
    render(<SetupGuide title="Guia" steps={steps} visible />);

    expect(screen.getByRole("link", { name: /Ir ao painel/ })).toHaveAttribute(
      "href",
      "https://exemplo.com",
    );
  });

  it("when a note is given, should show it after the steps", () => {
    render(<SetupGuide title="Guia" steps={steps} visible note="Há limite gratuito." />);

    expect(screen.getByText("Há limite gratuito.")).toBeInTheDocument();
  });

  it("when not visible, should not show the guide", () => {
    render(<SetupGuide title="Guia" steps={steps} visible={false} />);

    expect(screen.queryByRole("region", { name: "Guia" })).not.toBeInTheDocument();
  });

  it("when it stops being visible, should go away", async () => {
    const { rerender } = render(<SetupGuide title="Guia" steps={steps} visible />);
    expect(screen.getByRole("region", { name: "Guia" })).toBeInTheDocument();

    rerender(<SetupGuide title="Guia" steps={steps} visible={false} />);

    await vi.waitFor(() =>
      expect(screen.queryByRole("region", { name: "Guia" })).not.toBeInTheDocument(),
    );
  });
});

describe("ExternalLink bare", () => {
  it("when bare, should open outside the app without the link look or the arrow icon", () => {
    render(
      <ExternalLink bare href="https://exemplo.com/v?t=9s" className="chip" title="Abrir">
        0:09
      </ExternalLink>,
    );

    const link = screen.getByRole("link", { name: "0:09" });

    expect(link).toHaveAttribute("href", "https://exemplo.com/v?t=9s");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveAttribute("title", "Abrir");
    expect(link).toHaveClass("chip");
    expect(link).not.toHaveClass("underline");
    expect(link.querySelector("svg")).toBeNull();
  });
});
