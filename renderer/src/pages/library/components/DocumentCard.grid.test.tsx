import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

import type { DocumentSummary } from "../types/library.types";

import { DocumentCard, previewWithoutTitle } from "./DocumentCard";

const document: DocumentSummary = {
  id: "d1",
  title: "Subnetting em 10 minutos",
  type: "article",
  category: ["DevOps", "Redes"],
  tags: ["redes", "ipv4", "extra"],
  createdAt: "2026-03-10",
  preview: "Uma rede IPv4 é dividida em sub-redes.",
  matchedIn: undefined,
} as unknown as DocumentSummary;

const renderGrid = (doc = document) =>
  render(
    <MemoryRouter>
      <DocumentCard document={doc} variant="grid" />
    </MemoryRouter>,
  );

describe("DocumentCard grid (page thumbnail)", () => {
  it("when rendered, should look like a thumbnail sheet of paper", () => {
    const { container } = renderGrid();
    const sheet = container.querySelector("[data-slot=paper-page]");

    expect(sheet).toHaveAttribute("data-variant", "sheet");
    expect(sheet).toHaveAttribute("data-size", "thumb");
  });

  it("when rendered, should link the title to the page", () => {
    renderGrid();

    expect(screen.getByRole("link", { name: "Subnetting em 10 minutos" })).toHaveAttribute(
      "href",
      "/library/d1",
    );
  });

  it("when rendered, should show the category, the preview and the first two tags", () => {
    renderGrid();

    expect(screen.getByText("DevOps › Redes")).toBeInTheDocument();
    expect(screen.getByText(/sub-redes/)).toBeInTheDocument();
    expect(screen.getByText("#redes #ipv4")).toBeInTheDocument();
    expect(screen.queryByText(/extra/)).not.toBeInTheDocument();
  });

  it("when the page has no category, should say so", () => {
    renderGrid({ ...document, category: [] });

    expect(screen.getByText("Sem categoria")).toBeInTheDocument();
  });

  it("when the page was found in the content, should say so next to the date", () => {
    renderGrid({ ...document, matchedIn: "content" } as DocumentSummary);

    expect(screen.getByText(/No conteúdo/)).toBeInTheDocument();
  });
});

describe("DocumentCard grid size", () => {
  it("when rendered, should be as wide as a book cover in the bookshelf and keep the 3:4 proportion", () => {
    const { container } = renderGrid();

    // BooksPage: capa `mx-auto max-w-44` com `aspect-[3/4]`.
    expect(container.firstElementChild).toHaveClass("max-w-44", "mx-auto");
    expect(container.querySelector("[data-slot=paper-page]")).toHaveClass("aspect-[3/4]");
  });
});

describe("previewWithoutTitle", () => {
  it("when the preview starts with the title, should drop it", () => {
    expect(previewWithoutTitle("Subnetting Uma rede é dividida.", "Subnetting")).toBe(
      "Uma rede é dividida.",
    );
  });

  it("when the title differs only by case, should still drop it", () => {
    expect(previewWithoutTitle("SUBNETTING texto", "Subnetting")).toBe("texto");
  });

  it("when the preview does not start with the title, should keep it", () => {
    expect(previewWithoutTitle("Outro começo", "Subnetting")).toBe("Outro começo");
  });

  it("when the preview is only the title, should leave nothing", () => {
    expect(previewWithoutTitle("Subnetting", "Subnetting")).toBe("");
  });

  it('when rendered as a thumbnail, should tilt with the pointer and let the whole card (with its covering link) trigger it', () => {
    const { container } = renderGrid();
    const group = container.querySelector('[data-tilt-group]');

    expect(group).not.toBeNull();
    expect(group?.querySelector('[data-slot=tilt-card] [data-slot=paper-page]')).not.toBeNull();
    expect(group?.querySelector('a')).not.toBeNull();
  });

  it('when rendered as a list or a card, should not use the tilt effect', () => {
    for (const variant of ['list', 'card'] as const) {
      const { container, unmount } = render(
        <MemoryRouter>
          <DocumentCard document={document} variant={variant} />
        </MemoryRouter>,
      );

      expect(container.querySelector('[data-slot=tilt-card]')).toBeNull();
      unmount();
    }
  });
});
