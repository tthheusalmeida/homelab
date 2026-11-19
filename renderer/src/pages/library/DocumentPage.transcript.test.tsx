import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";

const documentQuery = {
  data: undefined as unknown,
  isLoading: false,
  isError: false,
};
const idle = { mutate: vi.fn(), isPending: false, isError: false };

vi.mock("./hooks/useLibrary", () => ({
  useDocument: () => documentQuery,
  useArchiveDocument: () => idle,
  useDiscardDocument: () => idle,
  useCategories: () => ({ data: [] }),
  useUpdateDocument: () => idle,
}));
vi.mock("./books/hooks", () => ({
  useBooks: () => ({ data: [], isLoading: false }),
  useAddBookChapter: () => idle,
  useCreateBook: () => idle,
}));

import { DocumentPage } from "./DocumentPage";

const timedBody =
  "[00:00:00] Primeiro trecho falado.\n\n[00:01:05] Segundo trecho falado.";

const detail = (overrides: { type?: string; content?: string; sourceUrl?: string }) => ({
  meta: {
    id: "id1",
    title: "Aula de redes",
    type: overrides.type ?? "transcription",
    source: "video",
    sourceUrl: overrides.sourceUrl ?? "https://youtu.be/abc123",
    status: "published",
    category: ["DevOps"],
    tags: [],
    createdAt: "2026-03-05T10:00:00.000Z",
    updatedAt: "2026-03-06T10:00:00.000Z",
  },
  content: overrides.content ?? timedBody,
});

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/library/id1"]}>
      <Routes>
        <Route path="/library/:id" element={<DocumentPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("DocumentPage — transcription with time", () => {
  beforeEach(() => {
    documentQuery.data = detail({});
    documentQuery.isLoading = false;
    documentQuery.isError = false;
  });

  it("when the transcription has time, should show the side rail and every excerpt in full", () => {
    renderPage();

    expect(
      screen.getByRole("complementary", { name: "Trechos da transcrição" }),
    ).toBeInTheDocument();
    // O texto fica no corpo; a barra lateral só repete o começo dele.
    expect(
      within(screen.getByRole("region", { name: "Trecho de 0:00" })).getByText(
        "Primeiro trecho falado.",
      ),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Trecho de 1:05" })).getByText(
        "Segundo trecho falado.",
      ),
    ).toBeInTheDocument();
  });

  it("when the source is YouTube, should link each time to the video at that moment", () => {
    renderPage();

    const link = screen.getByRole("link", { name: "1:05" });

    expect(link).toHaveAttribute("href", "https://youtu.be/abc123?t=65s");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("when the transcription is old, without time, should show it as plain text without the rail", () => {
    documentQuery.data = detail({ content: "Texto corrido de uma transcrição antiga." });
    renderPage();

    expect(screen.getByText("Texto corrido de uma transcrição antiga.")).toBeInTheDocument();
    expect(
      screen.queryByRole("complementary", { name: "Trechos da transcrição" }),
    ).not.toBeInTheDocument();
  });

  it("when the page is not a transcription, should not treat time-like text as excerpts", () => {
    documentQuery.data = detail({ type: "summary", content: timedBody });
    renderPage();

    expect(
      screen.queryByRole("complementary", { name: "Trechos da transcrição" }),
    ).not.toBeInTheDocument();
  });

  it("when in reading mode, should keep the rail and the excerpts", async () => {
    renderPage();
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Modo leitura/ }));

    await userEvent
      .setup()
      .hover(document.querySelector('[data-slot="reading-edge-left"]') as HTMLElement);

    const region = screen.getByRole("region", { name: "Modo leitura" });

    // A linha do tempo é o acompanhamento e fica no painel da esquerda.
    expect(
      within(
        within(region).getByRole("complementary", {
          name: "Acompanhamento da leitura",
        }),
      ).getByRole("complementary", { name: "Trechos da transcrição" }),
    ).toBeInTheDocument();
    expect(
      within(
        within(region).getByRole("region", { name: "Trecho de 1:05" }),
      ).getByText("Segundo trecho falado."),
    ).toBeInTheDocument();
  });
});
