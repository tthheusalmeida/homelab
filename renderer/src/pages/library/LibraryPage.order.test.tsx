import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

const documents = {
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  data: [] as unknown[],
};
const empty = { ...documents, data: [] };

vi.mock("./hooks/useLibrary", () => ({
  useDocuments: () => documents,
  useCategories: () => empty,
  useTags: () => empty,
  useUpdateDocument: () => ({ mutate: vi.fn(), isPending: false }),
  useDeleteCategory: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, error: null }),
  useRenameCategory: () => ({ mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, error: null }),
}));
vi.mock("#components/Snackbar", () => ({
  useSnackbar: () => ({ success: vi.fn(), error: vi.fn() }),
}));

import { LibraryPage } from "./LibraryPage";

const doc = (id: string, title: string) => ({
  id,
  title,
  type: "summary",
  source: "video",
  status: "published",
  category: ["Ciência"],
  tags: [],
  createdAt: "2026-03-05T10:00:00.000Z",
  updatedAt: "2026-03-05T10:00:00.000Z",
  fileName: `${id}.md`,
  preview: "",
});

const titles = () =>
  screen.getAllByTestId("draggable-item").map((item) => item.textContent?.match(/Docker|Kubernetes|Terraform/)?.[0]);

const renderPage = () =>
  render(
    <MemoryRouter>
      <LibraryPage />
    </MemoryRouter>,
  );

function drag(from: HTMLElement, to: HTMLElement) {
  const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };

  fireEvent.dragStart(from, { dataTransfer });
  fireEvent.dragEnter(to, { dataTransfer });
  fireEvent.dragOver(to, { dataTransfer });
  fireEvent.drop(to, { dataTransfer });
  fireEvent.dragEnd(from, { dataTransfer });
}

describe("LibraryPage custom order", () => {
  beforeEach(() => {
    documents.data = [doc("1", "Docker"), doc("2", "Kubernetes"), doc("3", "Terraform")];
    window.localStorage.clear();
  });

  it("when no page was dragged, should not offer to go back to the automatic order", () => {
    renderPage();

    expect(screen.queryByRole("button", { name: /ordem automática/ })).not.toBeInTheDocument();
  });

  it("when a page is dragged onto another, should reorder and keep it after reopening", () => {
    const { unmount } = renderPage();
    const [first, , third] = screen.getAllByTestId("draggable-item");

    drag(first, third);

    expect(titles()).toEqual(["Kubernetes", "Terraform", "Docker"]);

    unmount();
    renderPage();

    expect(titles()).toEqual(["Kubernetes", "Terraform", "Docker"]);
  });

  it("when going back to the automatic order, should restore it and forget the custom one", async () => {
    const user = userEvent.setup();
    renderPage();
    const [first, , third] = screen.getAllByTestId("draggable-item");

    drag(first, third);
    await user.click(screen.getByRole("button", { name: /Voltar à ordem automática/ }));

    expect(titles()).toEqual(["Docker", "Kubernetes", "Terraform"]);
    expect(window.localStorage.getItem("library:order")).toBeNull();
    expect(screen.queryByRole("button", { name: /ordem automática/ })).not.toBeInTheDocument();
  });
});

describe("LibraryPage custom order while dragging", () => {
  beforeEach(() => {
    documents.data = [doc("1", "Docker"), doc("2", "Kubernetes"), doc("3", "Terraform")];
    window.localStorage.clear();
  });

  it("when dragging over another page without dropping, should keep the order unchanged", () => {
    renderPage();
    const [first, , third] = screen.getAllByTestId("draggable-item");
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };

    fireEvent.dragStart(first, { dataTransfer });
    fireEvent.dragEnter(third, { dataTransfer });

    expect(titles()).toEqual(["Docker", "Kubernetes", "Terraform"]);
    expect(window.localStorage.getItem("library:order")).toBeNull();
  });

  it("when dragging over a page, should lift its bottom-right corner keeping the top-left fixed", () => {
    renderPage();
    const items = screen.getAllByTestId("draggable-item");
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };

    fireEvent.dragStart(items[0], { dataTransfer });
    fireEvent.dragEnter(items[2], { dataTransfer });

    expect(items[2]).toHaveClass("origin-top-left", "-rotate-3");
    expect(items[1]).not.toHaveClass("-rotate-3");

    fireEvent.dragEnd(items[0], { dataTransfer });

    expect(items[2]).not.toHaveClass("-rotate-3");
  });

  it("when the drag ends without dropping on a page, should keep the order", () => {
    renderPage();
    const [first, , third] = screen.getAllByTestId("draggable-item");
    const dataTransfer = { setData: vi.fn(), effectAllowed: "", dropEffect: "" };

    fireEvent.dragStart(first, { dataTransfer });
    fireEvent.dragEnter(third, { dataTransfer });
    fireEvent.dragEnd(first, { dataTransfer });

    expect(titles()).toEqual(["Docker", "Kubernetes", "Terraform"]);
    expect(screen.queryByRole("button", { name: /ordem automática/ })).not.toBeInTheDocument();
  });
});
