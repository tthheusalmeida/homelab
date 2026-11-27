import { describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import { renderWithSnackbar as render } from "#test/utils";
import userEvent from "@testing-library/user-event";

import { ChatComposer } from "./ChatComposer";
import { ChatEmptyState } from "./ChatEmptyState";
import { ChatMessage } from "./ChatMessage";
import { ChatMessageList } from "./ChatMessageList";

describe("ChatComposer", () => {
  const setup = (props: Partial<React.ComponentProps<typeof ChatComposer>> = {}) => {
    const onChange = vi.fn();
    const onSend = vi.fn();
    render(
      <ChatComposer
        value="texto"
        onChange={onChange}
        onSend={onSend}
        settings={<span>config</span>}
        {...props}
      />,
    );
    return { onChange, onSend, user: userEvent.setup() };
  };

  const box = () => screen.getByPlaceholderText("Envie uma mensagem...");

  it("when the field is empty, should start with one line and keep the button next to it, aligned to the bottom", () => {
    setup({ value: "" });

    const row = box().parentElement as HTMLElement;

    expect(box()).toHaveAttribute("rows", "1");
    expect(row).toHaveClass("items-end");
    expect(row).toContainElement(screen.getByRole("button", { name: "Enviar mensagem" }));
  });

  it("when typing, should call onChange with the new value", async () => {
    const { onChange, user } = setup({ value: "" });

    await user.type(box(), "a");

    expect(onChange).toHaveBeenCalledWith("a");
  });

  it("when Enter is pressed, should send", async () => {
    const { onSend, user } = setup();

    await user.type(box(), "{Enter}");

    expect(onSend).toHaveBeenCalledOnce();
  });

  it("when Shift+Enter is pressed, should not send", async () => {
    const { onSend, user } = setup();

    await user.type(box(), "{Shift>}{Enter}{/Shift}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("when disabled, should not send on Enter", async () => {
    const { onSend, user } = setup({ disabled: true });

    await user.type(box(), "{Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("when sending, should not send on Enter", async () => {
    const { onSend, user } = setup({ isSending: true });

    await user.type(box(), "{Enter}");

    expect(onSend).not.toHaveBeenCalled();
  });

  it("when the button is clicked, should send", async () => {
    const { onSend, user } = setup();

    await user.click(screen.getByRole("button"));

    expect(onSend).toHaveBeenCalledOnce();
  });

  it("when disabled, should disable the button", () => {
    setup({ disabled: true });

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("when rendered, should show the settings slot and the keyboard hint", () => {
    setup();

    expect(screen.getByText("config")).toBeInTheDocument();
    expect(screen.getByText(/Shift \+ Enter para nova linha/)).toBeInTheDocument();
  });
});

describe("ChatMessage", () => {
  it("when the role is user, should show the content as plain text", () => {
    render(
      <ChatMessage message={{ id: "1", role: "user", content: "**oi**" }} />,
    );

    expect(screen.getByText("**oi**")).toBeInTheDocument();
  });

  it("when the role is assistant, should render the content as markdown", () => {
    render(
      <ChatMessage
        message={{ id: "1", role: "assistant", content: "**oi**" }}
      />,
    );

    expect(screen.getByText("oi").tagName).toBe("STRONG");
  });
});

describe("ChatMessageList", () => {
  const messages = [
    { id: "1", role: "user" as const, content: "pergunta" },
    { id: "2", role: "assistant" as const, content: "resposta" },
  ];

  it("when given messages, should render all of them", () => {
    render(<ChatMessageList messages={messages} />);

    expect(screen.getByText("pergunta")).toBeInTheDocument();
    expect(screen.getByText("resposta")).toBeInTheDocument();
  });

  it("when status is sending, should show Pensando", () => {
    render(<ChatMessageList messages={messages} status="sending" />);

    expect(screen.getByText("Pensando")).toBeInTheDocument();
  });

  it("when status is cancelled, should show Geração cancelada without dots", () => {
    render(<ChatMessageList messages={messages} status="cancelled" />);

    expect(screen.getByText("Geração cancelada")).toBeInTheDocument();
    expect(screen.queryByText(".")).not.toBeInTheDocument();
  });

  it("when status is idle, should show no status message", () => {
    render(<ChatMessageList messages={messages} />);

    expect(screen.queryByText("Pensando")).not.toBeInTheDocument();
    expect(screen.queryByText("Geração cancelada")).not.toBeInTheDocument();
  });
});

describe("ChatEmptyState", () => {
  it("when rendered, should show the greeting", () => {
    render(<ChatEmptyState />);

    expect(screen.getByText("Como posso te ajudar hoje?")).toBeInTheDocument();
  });

  it("when time passes, should type the first phrase letter by letter", async () => {
    vi.useFakeTimers();
    try {
      render(<ChatEmptyState />);

      for (let i = 0; i < 3; i++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(70);
        });
      }

      expect(screen.getByText("Exp")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("ChatComposer: dica de contexto", () => {
  it("when a context hint is given, should show it next to the keyboard shortcuts", () => {
    render(
      <ChatComposer
        value=""
        onChange={vi.fn()}
        onSend={vi.fn()}
        settings={null}
        contextHint="~12 mil tokens no contexto (estimativa)"
      />,
    );

    expect(screen.getByTestId("context-hint")).toHaveTextContent("~12 mil tokens no contexto");
    expect(screen.getByText(/Enter para enviar/)).toBeInTheDocument();
  });

  it("when there is no hint, should show only the keyboard shortcuts", () => {
    render(<ChatComposer value="" onChange={vi.fn()} onSend={vi.fn()} settings={null} />);

    expect(screen.queryByTestId("context-hint")).not.toBeInTheDocument();
  });

  it("when sending, should name the button as stop; otherwise as send", () => {
    const { rerender } = render(
      <ChatComposer value="x" onChange={vi.fn()} onSend={vi.fn()} settings={null} />,
    );

    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeInTheDocument();

    rerender(
      <ChatComposer value="x" onChange={vi.fn()} onSend={vi.fn()} settings={null} isSending />,
    );

    expect(screen.getByRole("button", { name: "Parar geração" })).toBeInTheDocument();
  });
});

describe("ChatMessageList: erro de envio", () => {
  it("when there is a send error, should show it as an alert", () => {
    render(<ChatMessageList messages={[]} error="A requisição para o chat do Ollama falhou." />);

    expect(screen.getByRole("alert")).toHaveTextContent("A requisição para o chat do Ollama falhou.");
  });

  it("when there is no error, should show no alert and expose the messages as a log", () => {
    render(<ChatMessageList messages={[{ id: "1", role: "user", content: "oi" }]} />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("log", { name: "Mensagens da conversa" })).toHaveTextContent("oi");
  });
});
