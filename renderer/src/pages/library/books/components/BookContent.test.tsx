import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import type { BookReading } from "../types";

import { BookContent } from "./BookContent";

const chapter = (documentId: string, title: string, content: string) => ({
  documentId,
  title,
  category: [],
  available: true,
  content,
});

const modules: BookReading["modules"] = [
  {
    id: "m1",
    title: "Módulo 1",
    chapters: [
      chapter("d1", "Docker", "# Docker\n\n## Imagens\n\ntexto"),
      chapter("d2", "Redes", "# Redes\n\nconteúdo"),
    ],
  },
];

const renderContent = (
  props: Partial<React.ComponentProps<typeof BookContent>> = {},
) =>
  render(
    <MemoryRouter>
      <BookContent modules={modules} onGoToChapter={() => {}} {...props} />
    </MemoryRouter>,
  );

describe("BookContent", () => {
  it("when rendered, should label each chapter above its centered title and close it with a footer", () => {
    renderContent();

    const [first, second] = screen.getAllByRole("region");

    expect(first.querySelector("header")).toHaveTextContent("Capítulo 1");
    expect(first.querySelector("header")).toHaveClass("text-center");
    expect(second.querySelector("header")).toHaveTextContent("Capítulo 2");
    expect(first.querySelector("footer")).toBeInTheDocument();
  });

  it("when a module has a title, should show it as a subtle divider, not a banner", () => {
    renderContent();

    const parent = screen.getByRole("heading", { name: "Módulo 1", level: 2 })
      .parentElement;

    expect(parent).toHaveClass("flex", "items-center");
    expect(parent).not.toHaveClass("rounded-xl", "bg-primary/10");
  });

  it("when rendered, should give each chapter heading an id prefixed by its document", () => {
    renderContent();

    expect(screen.getByRole("heading", { name: "Imagens" })).toHaveAttribute(
      "id",
      "d1-imagens",
    );
  });

  it("when rendered, should not link each chapter to its page and should use the text size chosen by the reader", () => {
    const { container } = renderContent();

    const prose = container.querySelector(".prose") as HTMLElement;

    expect(
      screen.queryByRole("link", { name: "Abrir página" }),
    ).not.toBeInTheDocument();
    expect(prose).toHaveClass("prose-base");
    expect(prose.style.fontSize).toBe("inherit");
  });

  it("when a chapter has a next one, should offer to go to it", async () => {
    const onGoToChapter = vi.fn();
    const user = userEvent.setup();
    renderContent({ onGoToChapter });

    await user.click(screen.getByRole("button", { name: /Próximo: Redes/ }));

    expect(onGoToChapter).toHaveBeenCalledWith("d2");
  });

  it("when the chapter is the last one, should not offer a next button", () => {
    renderContent();

    expect(screen.getAllByRole("button", { name: /Próximo:/ })).toHaveLength(1);
  });
});
