import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { BookReading } from "../types";

import { BookSidebar } from "./BookSidebar";

const chapter = (documentId: string, title: string) => ({
  documentId,
  title,
  category: [],
  available: true,
  content: "",
});

const modules: BookReading["modules"] = [
  {
    id: "m1",
    title: "Módulo 1",
    chapters: [chapter("d1", "Docker"), chapter("d2", "Redes")],
  },
  { id: "m2", title: "", chapters: [chapter("d3", "Kubernetes")] },
];

const setup = (
  props: Partial<React.ComponentProps<typeof BookSidebar>> = {},
) => {
  const handlers = {
    onSelectChapter: vi.fn(),
  };

  render(<BookSidebar modules={modules} {...handlers} {...props} />);

  return { ...handlers, user: userEvent.setup() };
};

describe("BookSidebar", () => {
  it("when rendered, should list modules and numbered chapters in the summary", () => {
    setup();

    const nav = screen.getByRole("navigation", { name: "Sumário do livro" });

    expect(within(nav).getByText("Módulo 1")).toBeInTheDocument();
    expect(within(nav).getByText("1. Docker")).toBeInTheDocument();
    expect(within(nav).getByText("2. Redes")).toBeInTheDocument();
    expect(within(nav).getByText("3. Kubernetes")).toBeInTheDocument();
  });

  it("when a chapter is clicked, should select it", async () => {
    const { onSelectChapter, user } = setup();

    await user.click(screen.getByRole("button", { name: "2. Redes" }));

    expect(onSelectChapter).toHaveBeenCalledWith("d2");
  });

  it("when wide, should be sticky on the right side", () => {
    setup();

    expect(
      screen.getByRole("complementary", { name: "Painel do livro" }),
    ).toHaveClass("lg:sticky", "lg:top-4", "lg:self-start");
  });
});

describe("BookSidebar — active chapter", () => {
  it("when a chapter is being read, should highlight it in the summary", () => {
    render(
      <BookSidebar
        modules={modules}
        activeChapterId="d2"
        onSelectChapter={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "2. Redes" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    expect(
      screen.getByRole("button", { name: "1. Docker" }),
    ).not.toHaveAttribute("aria-current");
  });
});

describe("BookSidebar — read chapters", () => {
  it("when chapters were read, should mark them in the summary", () => {
    render(
      <BookSidebar
        modules={modules}
        readIds={["d1"]}
        onSelectChapter={() => {}}
        onToggleRead={() => {}}
      />,
    );

    expect(
      screen.getByRole("button", { name: 'Desmarcar "Docker" como lido' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "2. Redes" }),
    ).toBeInTheDocument();
  });
});
