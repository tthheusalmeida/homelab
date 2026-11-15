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
      chapter("d1", "Docker", "# Docker\n\ntexto do primeiro"),
      chapter("d2", "Redes", "# Redes\n\ntexto do segundo"),
    ],
  },
];

const renderPages = (
  props: Partial<React.ComponentProps<typeof BookContent>> = {},
) =>
  render(
    <MemoryRouter>
      <BookContent
        layout="pages"
        modules={modules}
        onGoToChapter={() => {}}
        {...props}
      />
    </MemoryRouter>,
  );

describe("BookContent in pages layout", () => {
  it("when rendered, should put each chapter on its own sheet of paper", () => {
    const { container } = renderPages();

    const sheets = container.querySelectorAll('[data-variant="sheet"]');

    expect(sheets).toHaveLength(2);
    expect(sheets[0]).toHaveTextContent("texto do primeiro");
    expect(sheets[1]).toHaveTextContent("texto do segundo");
  });

  it("when rendered, should number each sheet in its footer", () => {
    const { container } = renderPages();
    const sheets = container.querySelectorAll('[data-variant="sheet"]');

    expect(sheets[0].lastElementChild).toHaveTextContent(
      "Capítulo 1",
    );
    expect(sheets[1].lastElementChild).toHaveTextContent(
      "Capítulo 2",
    );
  });

  it("when rendered, should keep the module title as a divider between sheets", () => {
    renderPages();

    expect(
      screen.getByRole("heading", { name: "Módulo 1" }),
    ).toBeInTheDocument();
  });

  it("when rendered, should write the text with dark ink so it reads on the paper in any theme", () => {
    const { container } = renderPages();

    expect(container.querySelector(".prose")).toHaveClass("prose-stone");
    expect(container.querySelector(".prose")).not.toHaveClass(
      "dark:prose-invert",
    );
  });

  it("when a chapter is marked as read, should call back with the chapter and the new state", async () => {
    const user = userEvent.setup();
    const onToggleRead = vi.fn();
    renderPages({ onToggleRead, readIds: ["d2"] });

    const [first, second] = screen.getAllByRole("button", { name: /lido|Lido/ });
    await user.click(first);
    await user.click(second);

    expect(onToggleRead).toHaveBeenNthCalledWith(1, "d1", true);
    expect(onToggleRead).toHaveBeenNthCalledWith(2, "d2", false);
  });

  it("when the next chapter is asked, should go to it", async () => {
    const user = userEvent.setup();
    const onGoToChapter = vi.fn();
    renderPages({ onGoToChapter });

    await user.click(screen.getByRole("button", { name: /Próximo: Redes/ }));

    expect(onGoToChapter).toHaveBeenCalledWith("d2");
  });

  it("when rendered, should give each chapter the anchor the outline scrolls to", () => {
    renderPages();

    expect(screen.getAllByRole("region", { name: "Docker" })[0]).toHaveAttribute(
      "id",
    );
  });
});
