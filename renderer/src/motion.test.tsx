import * as fs from "node:fs";
import * as path from "node:path";

import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";

import { EmptyState } from "#components/EmptyState";
import { ReadingMode } from "#components/ReadingMode";
import { TagInput } from "#components/TagInput";
import { ErrorState } from "#components/ErrorState";

// O CSS é lido do disco: o Vitest roda com `css: false` e não devolve o conteúdo de `?raw`.
const css = fs.readFileSync(path.join(__dirname, "global.css"), "utf8");

import { createTestQueryClient } from "./test/utils";
import { AppLayout } from "./app/layouts/AppLayout";
import { JobStatusBadge } from "./pages/jobs/track/components/JobStatusBadge";
import { JobPipeline } from "./pages/jobs/track/components/JobPipeline";
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
    "animate-collapse-down",
    "animate-collapse-up",
  ])("when the stylesheet is read, should define the %s utility", (name) => {
    expect(css).toContain(`@utility ${name}`);
  });

  it("when the user prefers reduced motion, should shorten every animation and transition", () => {
    const block = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n  *,"));

    expect(block).toContain("animation-duration: 0.01ms !important");
    expect(block).toContain("transition-duration: 0.01ms !important");
  });

  it("when the keyframes are named, should not reuse a name from tw-animate-css", () => {
    // `enter`, `exit` e `collapsible-*` já existem no tw-animate-css (com opacidade fixa em 1):
    // reusar o nome faz a animação rodar sem efeito visível.
    for (const reserved of ["enter", "exit", "collapsible-down", "collapsible-up"]) {
      expect(css).not.toContain(`@keyframes ${reserved} `);
    }

    const animated = [...css.matchAll(/animation: ([\w-]+) /g)].map((match) => match[1])
      .filter((name) => name !== "none" && name !== "confetti-fall");

    expect(animated.length).toBeGreaterThan(0);
    for (const name of animated) {
      expect(name).toMatch(/^hl-/);
      expect(css).toContain(`@keyframes ${name} `);
    }
  });

  it("when a list animates, should cap the stagger delay", () => {
    expect(css).toContain("min(calc(var(--i, 0) * 70ms), 700ms)");
  });
});

function GoTo({ to }: { to: string }) {
  const navigate = useNavigate();

  return <button onClick={() => navigate(to)}>ir {to}</button>;
}

describe("AppLayout route transition", () => {
  it("when the route changes, should mount a fresh page block so it fades in again", async () => {
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={createTestQueryClient()}>
        <MemoryRouter initialEntries={["/a"]}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/a" element={<GoTo to="/b" />} />
              <Route path="/b" element={<p>página b</p>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    const before = screen.getByRole("button", { name: "ir /b" }).parentElement!;
    expect(before).toHaveClass("animate-enter-fade");

    await user.click(screen.getByRole("button", { name: "ir /b" }));

    const after = screen.getByText("página b").parentElement!;
    expect(after).toHaveClass("animate-enter-fade");
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
    expect(panel).toHaveClass("data-open:animate-collapse-down");
    expect(panel).toHaveClass("data-closed:animate-collapse-up");
  });
});

describe("small state changes", () => {
  it("when a tag is added, should pop in", () => {
    render(<TagInput value={["química"]} onChange={() => undefined} />);

    expect(screen.getByText("química").closest("li")).toHaveClass("animate-enter-scale");
  });

  it("when a pipeline step is completed, should pop its check and ease the marker colors", () => {
    const { container } = render(
      <JobPipeline
        job={{
          id: "j",
          name: "x",
          label: "x",
          status: "running",
          createdAt: "",
          completedAt: "",
          steps: [{ name: "a", label: "Baixar", status: "completed" }],
        }}
      />,
    );

    expect(container.querySelector("svg")).toHaveClass("animate-enter-scale");
    expect(container.querySelector("[data-status=completed] [class*=transition-colors]")).not.toBeNull();
  });

  it("when a job is running, should keep the status icon spinning", () => {
    const { container } = render(<JobStatusBadge status="running" />);

    expect(container.querySelector("svg")).toHaveClass("animate-spin");
  });

  it("when a job is completed, should pop the status icon", () => {
    const { container } = render(<JobStatusBadge status="completed" />);

    expect(container.querySelector("svg")).toHaveClass("animate-enter-scale");
  });

  it("when the reading mode opens, should fade in over the page", () => {
    render(
      <ReadingMode title="Livro" onExit={() => undefined} toc={null}>
        <p>texto</p>
      </ReadingMode>,
    );

    expect(screen.getByRole("region", { name: "Modo leitura" })).toHaveClass("animate-enter-fade");
  });
});
