import { describe, expect, it } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import type { ChatReference } from "#shared/contracts/chat";

import { ChatReferencesPanel } from "./ChatReferencesPanel";

const reference = (overrides: Partial<ChatReference> = {}): ChatReference => ({
  documentId: "doc-1",
  title: "DORA",
  headingPath: ["DORA", "Métricas"],
  anchor: "metricas",
  category: [],
  ...overrides,
});

const renderPanel = (references: Parameters<typeof ChatReferencesPanel>[0]["references"]) =>
  render(
    <MemoryRouter>
      <ChatReferencesPanel references={references} />
    </MemoryRouter>,
  );

describe("ChatReferencesPanel", () => {
  it("when the chat used no page, should show the button disabled", () => {
    renderPanel([]);

    expect(screen.getByRole("button", { name: /nenhuma ainda/ })).toBeDisabled();
  });

  it("when the chat used pages, should show how many and open the list of all of them with links and counts", async () => {
    const user = userEvent.setup();

    renderPanel([
      { reference: reference(), answers: 2 },
      { reference: reference({ documentId: "doc-2", title: "Scrum", headingPath: ["Scrum"], anchor: null }), answers: 1 },
    ]);

    await user.click(screen.getByRole("button", { name: "Referências desta conversa: 2" }));

    const list = await screen.findByRole("list", { name: "Referências desta conversa" });
    const links = within(list).getAllByRole("link");

    expect(links[0]).toHaveAttribute("href", "/library/doc-1#metricas");
    expect(links[0]).toHaveTextContent("DORA › Métricas");
    expect(links[0]).toHaveTextContent("2 respostas");
    expect(links[1]).toHaveAttribute("href", "/library/doc-2");
    expect(links[1]).toHaveTextContent("1 resposta");
  });

  it("when a link is clicked, should close the list", async () => {
    const user = userEvent.setup();

    renderPanel([{ reference: reference(), answers: 1 }]);
    await user.click(screen.getByRole("button", { name: /Referências desta conversa/ }));
    await user.click(await screen.findByRole("link"));

    await waitFor(() =>
      expect(
        screen.queryByRole("list", { name: "Referências desta conversa" }),
      ).not.toBeInTheDocument(),
    );
  });
});
