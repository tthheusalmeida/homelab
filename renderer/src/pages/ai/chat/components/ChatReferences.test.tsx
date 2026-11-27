import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";

import type { ChatReference } from "#shared/contracts/chat";

import { ChatMessage } from "./ChatMessage";
import { ChatReferences } from "./ChatReferences";

const reference = (overrides: Partial<ChatReference> = {}): ChatReference => ({
  documentId: "doc-1",
  title: "Práticas da Primeira Maneira",
  headingPath: ["Práticas da Primeira Maneira", "Fluxo de trabalho"],
  anchor: "fluxo-de-trabalho",
  category: ["DevOps"],
  ...overrides,
});

const renderIn = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe("ChatReferences", () => {
  it("when a reference has a section, should link to the page at that section", () => {
    renderIn(<ChatReferences references={[reference()]} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/library/doc-1#fluxo-de-trabalho");
  });

  it("when a reference has no anchor, should link to the page without a hash", () => {
    renderIn(<ChatReferences references={[reference({ anchor: null, headingPath: [] })]} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/library/doc-1");
  });

  it("when the path repeats the page title, should show the page and only the section", () => {
    renderIn(<ChatReferences references={[reference()]} />);

    expect(screen.getByText("Práticas da Primeira Maneira")).toBeInTheDocument();
    expect(screen.getByText("› Fluxo de trabalho")).toBeInTheDocument();
  });

  it("when there are several references, should list them all under the references label", () => {
    renderIn(
      <ChatReferences
        references={[
          reference(),
          reference({ documentId: "doc-2", title: "Segunda Maneira", headingPath: [], anchor: null }),
        ]}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Referências" });

    expect(nav.querySelectorAll("a")).toHaveLength(2);
  });

  it("when there are no references, should render nothing", () => {
    const { container } = renderIn(<ChatReferences references={[]} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe("ChatMessage com referências", () => {
  it("when an assistant message has references, should show them below the answer", () => {
    renderIn(
      <ChatMessage
        message={{ id: "1", role: "assistant", content: "Resposta", references: [reference()] }}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Referências" })).toBeInTheDocument();
  });

  it("when an assistant message has no references, should not show the list", () => {
    renderIn(<ChatMessage message={{ id: "1", role: "assistant", content: "Resposta" }} />);

    expect(screen.queryByRole("navigation", { name: "Referências" })).not.toBeInTheDocument();
  });

  it("when a user message carries references by mistake, should still not show them", () => {
    renderIn(
      <ChatMessage
        message={{ id: "1", role: "user", content: "Pergunta", references: [reference()] }}
      />,
    );

    expect(screen.queryByRole("navigation", { name: "Referências" })).not.toBeInTheDocument();
  });
});

describe("ChatReferences: abrir para a esquerda", () => {
  it("when rendered, should put a hairline and the word references before the icons", () => {
    renderIn(<ChatReferences references={[reference()]} />);

    expect(screen.getByText("referências")).toBeInTheDocument();
  });

  it("when a reference is closed, should still be announced by its full name", () => {
    renderIn(<ChatReferences references={[reference()]} />);

    expect(
      screen.getByRole("link", { name: "Práticas da Primeira Maneira › Fluxo de trabalho" }),
    ).toBeInTheDocument();
  });

  it("when a reference has a name, should lay it out left of the icon so it grows leftwards", () => {
    renderIn(<ChatReferences references={[reference()]} />);

    const link = screen.getByRole("link");
    const [label, icon] = Array.from(link.children);

    expect(label).toHaveClass("grid-cols-[0fr]");
    expect(label.className).toContain("group-hover:grid-cols-[1fr]");
    expect(icon.querySelector("svg")).not.toBeNull();
  });
});

describe("ChatReferences: consulta rápida", () => {
  it("when a preview handler exists, should open the reference on click instead of navigating", async () => {
    const onPreview = vi.fn();
    const user = userEvent.setup();

    renderIn(<ChatReferences references={[reference({ number: 1 })]} onPreview={onPreview} />);
    await user.click(screen.getByRole("link"));

    expect(onPreview).toHaveBeenCalledWith(expect.objectContaining({ documentId: "doc-1" }));
  });

  it("when Ctrl is held, should let the link go to the page as before", async () => {
    const onPreview = vi.fn();
    const user = userEvent.setup();

    renderIn(<ChatReferences references={[reference()]} onPreview={onPreview} />);
    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("link"));
    await user.keyboard("{/Control}");

    expect(onPreview).not.toHaveBeenCalled();
  });

  it("when there is no preview handler, should just keep the link to the page", () => {
    renderIn(<ChatReferences references={[reference()]} />);

    expect(screen.getByRole("link")).toHaveAttribute("href", "/library/doc-1#fluxo-de-trabalho");
  });
});

describe("ChatMessage: marcas no texto e referências no fim", () => {
  const second = reference({
    documentId: "doc-2",
    title: "Segunda Maneira",
    headingPath: [],
    anchor: null,
    number: 2,
  });

  it("when the text has [1] and [2], should keep them as plain text", () => {
    renderIn(
      <ChatMessage
        message={{
          id: "1",
          role: "assistant",
          content: "O fluxo vem primeiro [1] e depois o feedback [2].",
          references: [reference({ number: 1 }), second],
        }}
      />,
    );

    expect(screen.getByText(/O fluxo vem primeiro \[1\] e depois o feedback \[2\]\./)).toBeInTheDocument();
  });

  it("when several pages came with the answer, should list every one of them at the end", () => {
    renderIn(
      <ChatMessage
        message={{
          id: "1",
          role: "assistant",
          content: "Fala do fluxo [1].",
          references: [reference({ number: 1 }), second],
        }}
      />,
    );

    const nav = screen.getByRole("navigation", { name: "Referências" });

    expect(nav.querySelectorAll("a")).toHaveLength(2);
  });

  it("when a reference knows its mark, should show that number on the icon so text and source match", () => {
    renderIn(
      <ChatReferences references={[reference({ number: 1 }), second]} />,
    );

    expect(screen.getAllByTestId("reference-number").map((badge) => badge.textContent)).toEqual([
      "1",
      "2",
    ]);
  });

  it("when a reference has no number (saved before the numbering existed), should show the icon without a badge", () => {
    renderIn(<ChatReferences references={[reference()]} />);

    expect(screen.queryByTestId("reference-number")).not.toBeInTheDocument();
  });

  it("when the answer has no references, should show no list", () => {
    renderIn(
      <ChatMessage
        message={{ id: "1", role: "assistant", content: "Resposta sem fontes [1]." }}
      />,
    );

    expect(screen.queryByRole("navigation", { name: "Referências" })).not.toBeInTheDocument();
  });

  it("when a user writes [1] in their own message, should keep it as typed", () => {
    renderIn(<ChatMessage message={{ id: "1", role: "user", content: "Veja o item [1]" }} />);

    expect(screen.getByText("Veja o item [1]")).toBeInTheDocument();
  });
});

describe("ChatMessage: resposta fora das páginas", () => {
  it("when the answer has no references, should show only the text, with no warning", () => {
    renderIn(<ChatMessage message={{ id: "1", role: "assistant", content: "Paris é a capital da França." }} />);

    expect(screen.getByText("Paris é a capital da França.")).toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Referências" })).not.toBeInTheDocument();
  });
});
