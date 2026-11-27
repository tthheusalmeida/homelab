import { describe, expect, it, vi } from "vitest";
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
  number: 1,
  ...overrides,
});

type Answers = Parameters<typeof ChatReferencesPanel>[0]["answers"];

const renderPanel = (answers: Answers, total = answers.length) =>
  render(
    <MemoryRouter>
      <ChatReferencesPanel answers={answers} total={total} />
    </MemoryRouter>,
  );

describe("ChatReferencesPanel", () => {
  it("when the chat used no page, should show the button disabled", () => {
    renderPanel([]);

    expect(screen.getByRole("button", { name: /nenhuma ainda/ })).toBeDisabled();
  });

  it("when the chat used pages, should list them by answer, each with the number of its mark and a link", async () => {
    const user = userEvent.setup();

    renderPanel(
      [
        {
          id: "a1",
          question: "O que é DORA?",
          references: [
            reference({ number: 1 }),
            reference({ documentId: "doc-2", title: "Scrum", headingPath: ["Scrum"], anchor: null, number: 3 }),
          ],
        },
        { id: "a2", question: "E o Scrum?", references: [reference({ documentId: "doc-2", title: "Scrum", headingPath: ["Scrum"], anchor: null, number: 1 })] },
      ],
      2,
    );

    await user.click(screen.getByRole("button", { name: "Referências desta conversa: 2" }));

    const first = await screen.findByRole("region", { name: "Resposta a: O que é DORA?" });
    const links = within(first).getAllByRole("link");

    expect(links[0]).toHaveAttribute("href", "/library/doc-1#metricas");
    expect(links[0]).toHaveTextContent("[1]");
    expect(links[0]).toHaveTextContent("DORA › Métricas");
    expect(links[1]).toHaveAttribute("href", "/library/doc-2");
    expect(links[1]).toHaveTextContent("[3]");

    const second = screen.getByRole("region", { name: "Resposta a: E o Scrum?" });

    expect(within(second).getByRole("link")).toHaveTextContent("[1]");
  });

  it("when a reference has no number (saved before the numbering), should list it without one", async () => {
    const user = userEvent.setup();

    renderPanel([{ id: "a", question: "", references: [reference({ number: undefined })] }], 1);
    await user.click(screen.getByRole("button", { name: /Referências desta conversa/ }));

    expect(await screen.findByRole("link")).not.toHaveTextContent("[");
    expect(screen.getByRole("region", { name: "Resposta" })).toBeInTheDocument();
  });

  it("when a preview handler exists, should close the list and open that reference for consulting", async () => {
    const user = userEvent.setup();
    const onPreview = vi.fn();

    render(
      <MemoryRouter>
        <ChatReferencesPanel
          answers={[{ id: "a", question: "p", references: [reference()] }]}
          total={1}
          onPreview={onPreview}
        />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: /Referências desta conversa/ }));
    await user.click(await screen.findByRole("link"));

    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ documentId: "doc-1" }));
  });

  it("when a link is clicked, should close the list", async () => {
    const user = userEvent.setup();

    renderPanel([{ id: "a", question: "p", references: [reference()] }], 1);
    await user.click(screen.getByRole("button", { name: /Referências desta conversa/ }));
    await user.click(await screen.findByRole("link"));

    await waitFor(() => expect(screen.queryByRole("link")).not.toBeInTheDocument());
  });
});
