import { describe, expect, it, vi } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { IpcChannels } from "#shared/channels";
import type { ChatReference } from "#shared/contracts/chat";
import { failure, mockApi, ok } from "#test/api-mock";

import { createTestQueryClient } from "../../../../test/utils";

import { ReferencePreview } from "./ReferencePreview";

const reference = (overrides: Partial<ChatReference> = {}): ChatReference => ({
  documentId: "doc-1",
  title: "DORA",
  headingPath: ["DORA", "Métricas"],
  anchor: "metricas",
  category: [],
  ...overrides,
});

const detail = {
  meta: { id: "doc-1", title: "DORA", type: "summary", status: "published" },
  content: "# DORA\n\nIntrodução.\n\n## Métricas\n\nQuatro métricas de entrega.",
};

function Where() {
  const location = useLocation();

  return <p data-testid="where">{location.pathname + location.hash}</p>;
}

const setup = (
  documentResult: unknown = ok(detail),
  value: ChatReference | null = reference(),
  onClose = vi.fn(),
) => {
  mockApi({ [IpcChannels.library.documents.get]: () => documentResult });

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <MemoryRouter initialEntries={["/ai/chat"]}>
        <ReferencePreview reference={value} onClose={onClose} />
        <Where />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { onClose, user: userEvent.setup() };
};

describe("ReferencePreview", () => {
  it("when a reference is opened, should show the page content without leaving the conversation", async () => {
    setup();

    expect(await screen.findByText("Quatro métricas de entrega.")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("DORA › Métricas");
    expect(screen.getByTestId("where")).toHaveTextContent("/ai/chat");
  });

  it("when closed, should render nothing", () => {
    setup(ok(detail), null);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("when the page cannot be opened, should say so and still offer to open the page", async () => {
    setup(failure("NOT_FOUND", "Sumiu"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível abrir esta página");
    expect(screen.getByRole("button", { name: "Abrir a página" })).toBeInTheDocument();
  });

  it("when Open the page is clicked, should close the preview and go to the page at the section", async () => {
    const { user, onClose } = setup();

    await screen.findByText("Quatro métricas de entrega.");
    await user.click(screen.getByRole("button", { name: "Abrir a página" }));

    expect(onClose).toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByTestId("where")).toHaveTextContent("/library/doc-1#metricas"),
    );
  });

  it("when Close is clicked, should only close and stay in the conversation", async () => {
    const { user, onClose } = setup();

    await screen.findByText("Quatro métricas de entrega.");
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalled();
    expect(screen.getByTestId("where")).toHaveTextContent("/ai/chat");
  });
});
