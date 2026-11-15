import * as fs from "node:fs";
import * as path from "node:path";

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";

import { EmptyState } from "#components/EmptyState";
import { ErrorState } from "#components/ErrorState";

// O CSS é lido do disco: o Vitest roda com `css: false` e não devolve o conteúdo de `?raw`.
const css = fs.readFileSync(path.join(__dirname, "global.css"), "utf8");

import { AppLayout } from "./app/layouts/AppLayout";
import { ServiceCard } from "./pages/home/components/ServiceCard";
import { services } from "./pages/home/types/services.types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "#ui/collapsible";

describe("motion css", () => {
  it.each([
    "animate-enter",
    "animate-enter-fade",
    "animate-enter-scale",
    "animate-enter-left",
    "animate-exit-down",
    "animate-collapsible-down",
    "animate-collapsible-up",
  ])("when the stylesheet is read, should define the %s utility", (name) => {
    expect(css).toContain(`@utility ${name}`);
  });

  it("when the user prefers reduced motion, should shorten every animation and transition", () => {
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n  *,"));

    expect(block).toContain("animation-duration: 0.01ms !important");
    expect(block).toContain("transition-duration: 0.01ms !important");
  });

  it("when a list animates, should cap the stagger delay", () => {
    expect(css).toContain("min(calc(var(--i, 0) * 45ms), 450ms)");
  });
});

function GoTo({ to }: { to: string }) {
  const navigate = useNavigate();

  return <button onClick={() => navigate(to)}>ir {to}</button>;
}

describe("AppLayout route transition", () => {
  it("when the route changes, should mount a fresh page block so it enters again", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/a"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/a" element={<GoTo to="/b" />} />
            <Route path="/b" element={<p>página b</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const before = screen.getByRole("button", { name: "ir /b" }).parentElement!;
    expect(before).toHaveClass("animate-enter");

    await user.click(screen.getByRole("button", { name: "ir /b" }));

    const after = screen.getByText("página b").parentElement!;
    expect(after).toHaveClass("animate-enter");
    expect(after).not.toBe(before);
  });
});

describe("entry animations", () => {
  it("when an empty state renders, should enter softly", () => {
    const { container } = render(<EmptyState title="Nada aqui" />);

    expect(container.firstElementChild).toHaveClass("animate-enter");
  });

  it("when an error state renders, should enter softly", () => {
    const { container } = render(<ErrorState primaryMessage="Falhou" />);

    expect(container.firstElementChild).toHaveClass("animate-enter");
  });

  it("when a service card is the third of the grid, should stagger its entry by its index", () => {
    const { container } = render(
      <ServiceCard service={services[0]} isLoading={false} index={2} />,
    );
    const card = container.firstElementChild as HTMLElement;

    expect(card).toHaveClass("animate-enter");
    expect(card.style.getPropertyValue("--i")).toBe("2");
  });
});

describe("collapsible", () => {
  it("when opened, should animate the panel height", async () => {
    const user = userEvent.setup();
    render(
      <Collapsible>
        <CollapsibleTrigger>abrir</CollapsibleTrigger>
        <CollapsibleContent>conteúdo</CollapsibleContent>
      </Collapsible>,
    );

    await user.click(screen.getByRole("button", { name: "abrir" }));

    const panel = screen.getByText("conteúdo");
    expect(panel).toHaveClass("data-open:animate-collapsible-down");
    expect(panel).toHaveClass("data-closed:animate-collapsible-up");
  });
});
