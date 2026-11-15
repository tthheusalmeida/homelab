import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { ChatSummary } from "#shared/contracts/chat";

import { ChatList } from "./ChatList";
import { ContextWarningDialog } from "./ContextWarningDialog";

const chat = (id: string, count = 2): ChatSummary => ({
  id,
  title: `Conversa ${id}`,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  providerId: "ollama",
  modelId: "m",
  messageCount: count,
});

const setup = (props: Partial<React.ComponentProps<typeof ChatList>> = {}) => {
  const handlers = {
    onSelect: vi.fn(),
    onNew: vi.fn(),
    onDelete: vi.fn(),
    onRetry: vi.fn(),
  };

  render(
    <ChatList
      chats={[chat("a", 1), chat("b", 4)]}
      isLoading={false}
      isError={false}
      activeId="a"
      {...handlers}
      {...props}
    />,
  );

  return { ...handlers, user: userEvent.setup() };
};

describe("ChatList", () => {
  it("when chats exist, should list them with the message count in the singular or plural", () => {
    setup();

    expect(screen.getByText("Conversa a")).toBeInTheDocument();
    expect(screen.getByText("1 mensagem")).toBeInTheDocument();
    expect(screen.getByText("4 mensagens")).toBeInTheDocument();
  });

  it("when a chat is clicked, should call onSelect with its id", async () => {
    const { onSelect, user } = setup();

    await user.click(screen.getByRole("button", { name: /^Conversa b/ }));

    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("when the trash button is clicked, should call onDelete with that chat and not select it", async () => {
    const { onDelete, onSelect, user } = setup();

    await user.click(screen.getByRole("button", { name: "Excluir a conversa Conversa b" }));

    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "b" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("when New chat is clicked, should call onNew", async () => {
    const { onNew, user } = setup();

    await user.click(screen.getByRole("button", { name: /Novo chat/ }));

    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it("when the open chat is in the list, should mark it as the current page", () => {
    setup({ activeId: "b" });

    expect(screen.getByRole("button", { name: /^Conversa b/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: /^Conversa a/ })).not.toHaveAttribute("aria-current");
  });

  it("when the list is empty, should tell the user how to start", () => {
    setup({ chats: [] });

    expect(screen.getByText(/Nenhuma conversa ainda/)).toBeInTheDocument();
  });

  it("when the list is loading, should not show the empty message", () => {
    setup({ chats: undefined, isLoading: true });

    expect(screen.queryByText(/Nenhuma conversa ainda/)).not.toBeInTheDocument();
  });

  it("when loading fails, should show the error and a retry button", async () => {
    const { onRetry, user } = setup({ chats: undefined, isError: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as conversas");

    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("when disabled (an answer is being generated), should block selecting, deleting and creating", () => {
    setup({ disabled: true });

    expect(screen.getByRole("button", { name: /Novo chat/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^Conversa a/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Excluir a conversa Conversa a" })).toBeDisabled();
  });
});

describe("ContextWarningDialog", () => {
  const renderDialog = (percent: number | null = 85) => {
    const handlers = { onSend: vi.fn(), onNewChat: vi.fn(), onCancel: vi.fn() };

    render(<ContextWarningDialog open tokens="~120 mil tokens" percent={percent} {...handlers} />);

    return { ...handlers, user: userEvent.setup() };
  };

  it("when the limit is known, should say the size and the percentage of the model limit", () => {
    renderDialog(85);

    expect(screen.getByRole("dialog")).toHaveTextContent("~120 mil tokens");
    expect(screen.getByRole("dialog")).toHaveTextContent("cerca de 85% do limite do modelo");
  });

  it("when the limit is unknown, should say only the size", () => {
    renderDialog(null);

    expect(screen.getByRole("dialog")).toHaveTextContent("~120 mil tokens");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("limite do modelo");
  });

  it("when each button is clicked, should call its own action", async () => {
    const { onSend, onNewChat, onCancel, user } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Enviar mesmo assim" }));
    await user.click(screen.getByRole("button", { name: "Começar um chat novo" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onNewChat).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("when Escape is pressed, should cancel", async () => {
    const { onCancel, user } = renderDialog();

    await user.keyboard("{Escape}");

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("when closed, should render nothing", () => {
    render(
      <ContextWarningDialog
        open={false}
        tokens="~1 mil tokens"
        percent={null}
        onSend={vi.fn()}
        onNewChat={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
