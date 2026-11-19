import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { BookReading } from "../types";

import { BookOutline } from "./BookOutline";

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
    title: "",
    chapters: [chapter("d1", "Docker"), chapter("d2", "Redes")],
  },
];

const mark = (title: string) =>
  screen.getByRole("button", { name: title }).parentElement?.querySelector(
    "[data-slot=read-mark]",
  ) as HTMLElement;

describe("BookOutline — read chapters", () => {
  it("when a chapter is read, should show a check and announce it", () => {
    render(
      <BookOutline
        modules={modules}
        readIds={["d1"]}
        onSelectChapter={() => {}}
      />,
    );

    expect(mark("1. Docker").querySelector("svg")).toBeInTheDocument();
    expect(mark("1. Docker")).toHaveTextContent(", lido");
    expect(mark("2. Redes").querySelector("svg")).not.toBeInTheDocument();
  });

  it("when no chapter is read, should show no check", () => {
    render(<BookOutline modules={modules} onSelectChapter={() => {}} />);

    expect(document.querySelector("svg")).not.toBeInTheDocument();
  });

  it("when chapters are listed, should reserve the same mark column in every row, read or not", () => {
    render(
      <BookOutline
        modules={modules}
        readIds={["d1"]}
        onSelectChapter={() => {}}
      />,
    );

    const slots = document.querySelectorAll("[data-slot=read-mark]");

    expect(slots).toHaveLength(2);
    for (const slot of slots) {
      expect(slot).toHaveClass("h-5", "w-6", "shrink-0", "justify-center");
    }
  });

  it("when the title is long, should let it wrap in its own column", () => {
    render(<BookOutline modules={modules} onSelectChapter={() => {}} />);

    expect(
      screen.getByRole("button", { name: "1. Docker" }).firstElementChild,
    ).toHaveClass("min-w-0", "flex-1");
  });

  it("when the chapters are listed, should not draw a bar on their left", () => {
    render(<BookOutline modules={modules} onSelectChapter={() => {}} />);

    const list = screen.getByRole("button", { name: "1. Docker" }).closest("ul");

    expect(list?.className).not.toContain("border-l");
  });
});

describe("BookOutline — toggling read from the summary", () => {
  it("when a toggle function is given, should offer a button to mark an unread chapter", async () => {
    const onToggleRead = vi.fn();
    render(
      <BookOutline
        modules={modules}
        readIds={["d1"]}
        onSelectChapter={() => {}}
        onToggleRead={onToggleRead}
      />,
    );

    const button = screen.getByRole("button", { name: 'Marcar "Redes" como lido' });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.setup().click(button);

    expect(onToggleRead).toHaveBeenCalledWith("d2", true);
  });

  it("when a chapter is read, should offer a button to unmark it", async () => {
    const onToggleRead = vi.fn();
    render(
      <BookOutline
        modules={modules}
        readIds={["d1"]}
        onSelectChapter={() => {}}
        onToggleRead={onToggleRead}
      />,
    );

    const button = screen.getByRole("button", { name: 'Desmarcar "Docker" como lido' });
    expect(button).toHaveAttribute("aria-pressed", "true");

    await userEvent.setup().click(button);

    expect(onToggleRead).toHaveBeenCalledWith("d1", false);
  });

  it("when the toggle is clicked, should not open the chapter", async () => {
    const onSelectChapter = vi.fn();
    render(
      <BookOutline
        modules={modules}
        onSelectChapter={onSelectChapter}
        onToggleRead={() => {}}
      />,
    );

    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: 'Marcar "Docker" como lido' }));

    expect(onSelectChapter).not.toHaveBeenCalled();
  });
});
