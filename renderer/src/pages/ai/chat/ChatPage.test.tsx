import { describe, expect, it } from "vitest";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router";
import { act, screen, waitFor, within } from "@testing-library/react";
import { renderWithSnackbar as render } from "#test/utils";
import userEvent from "@testing-library/user-event";

import { IpcChannels } from "#shared/channels";
import type { ChatDetail, ChatSummary } from "#shared/contracts/chat";
import { failure, mockApi, ok, payloadsOf } from "#test/api-mock";

import { createTestQueryClient } from "../../../test/utils";

import { ChatPage } from "./ChatPage";

const iso = (minute: number) => `2026-01-01T10:${String(minute).padStart(2, "0")}:00.000Z`;

const makeChat = (id: string, overrides: Partial<ChatDetail> = {}): ChatDetail => ({
  id,
  title: `Conversa ${id}`,
  createdAt: iso(0),
  updatedAt: iso(1),
  providerId: "ollama",
  modelId: "m1",
  thinking: "off",
  messageCount: 2,
  messages: [
    { id: `${id}-1`, role: "user", content: `pergunta ${id}`, createdAt: iso(0) },
    { id: `${id}-2`, role: "assistant", content: `resposta ${id}`, createdAt: iso(0) },
  ],
  ...overrides,
});

const summaryOf = (chat: ChatDetail): ChatSummary => {
  const { messages, ...summary } = chat;

  return { ...summary, messageCount: messages.length };
};

interface SetupOptions {
  chats?: ChatDetail[];
  /** Resposta do envio: por padrão responde "ok!". */
  send?: (payload: { chatId: string; message: string }) => unknown;
  /** Limite de contexto do modelo (0 = desconhecido). */
  contextLength?: number;
  url?: string;
}

/** Tela de chat com os hooks reais; o IPC é simulado com um "banco" de chats em memória. */
function setup(options: SetupOptions = {}) {
  const chats = [...(options.chats ?? [])];
  const client = createTestQueryClient();

  const invoke = mockApi({
    [IpcChannels.ai.providers]: () =>
      ok([
        { id: "ollama", label: "Ollama" },
        { id: "gemini", label: "Gemini" },
      ]),
    [IpcChannels.ai.models]: () =>
      ok([
        {
          id: "m1",
          label: "M1",
          providerId: "ollama",
          details: { context_length: options.contextLength ?? 0 },
        },
      ]),
    [IpcChannels.ai.thinking]: () => ok([{ id: "off", label: "Desativado" }]),
    [IpcChannels.chats.list]: () => ok(chats.map(summaryOf)),
    [IpcChannels.chats.get]: (payload) => {
      const found = chats.find((chat) => chat.id === (payload as { id: string }).id);

      return found ? ok(found) : failure("NOT_FOUND", "Chat não encontrado.");
    },
    [IpcChannels.chats.delete]: (payload) => {
      const index = chats.findIndex((chat) => chat.id === (payload as { id: string }).id);

      if (index >= 0) {
        chats.splice(index, 1);
      }

      return ok(undefined);
    },
    [IpcChannels.chat.cancel]: () => ok(undefined),
    [IpcChannels.chat.send]: (payload) => {
      const request = payload as { chatId: string; message: string };

      if (options.send) {
        return options.send(request);
      }

      const existing = chats.find((chat) => chat.id === request.chatId);
      const messages = [
        ...(existing?.messages ?? []),
        { id: `u${chats.length}-${request.message}`, role: "user" as const, content: request.message, createdAt: iso(2) },
        { id: `a${chats.length}-${request.message}`, role: "assistant" as const, content: "ok!", createdAt: iso(2) },
      ];
      const updated = makeChat(request.chatId, {
        title: existing?.title ?? request.message,
        messages,
        messageCount: messages.length,
      });

      // o chat atualizado vai para o topo da lista (o mais recente primeiro)
      if (existing) {
        chats.splice(chats.indexOf(existing), 1);
      }

      chats.unshift(updated);

      return ok({ message: "ok!", chat: updated });
    },
  });

  let search = "";

  function LocationProbe() {
    search = useLocation().search;

    return null;
  }

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[options.url ?? "/ai/chat"]}>
        <ChatPage />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { invoke, chats, search: () => search };
}

const textbox = () => screen.getByPlaceholderText("Envie uma mensagem...");
const sendButton = () => screen.getByRole("button", { name: /Enviar mensagem|Parar geração/ });
const chatList = () => screen.getByRole("navigation", { name: "Conversas" });
/** A conversa aberta (as mensagens), sem confundir com os títulos da lista lateral. */
const conversation = () => screen.getByRole("log", { name: "Mensagens da conversa" });

describe("ChatPage: lista de conversas", () => {
  it("when there are no chats, should show the empty state and say no conversation exists yet", async () => {
    setup();

    expect(await screen.findByText(/Nenhuma conversa ainda/)).toBeInTheDocument();
    expect(screen.getByText("Como posso te ajudar hoje?")).toBeInTheDocument();
  });

  it("when there are saved chats, should list them with their titles and message counts", async () => {
    setup({ chats: [makeChat("a"), makeChat("b", { messages: [], messageCount: 0 })] });

    expect(await within(chatList()).findByText("Conversa a")).toBeInTheDocument();
    expect(within(chatList()).getByText("Conversa b")).toBeInTheDocument();
    expect(within(chatList()).getAllByText(/mensage/)).toHaveLength(2);
  });

  it("when a chat is clicked, should open it with all its messages and point the URL to it", async () => {
    const user = userEvent.setup();
    const { search } = setup({ chats: [makeChat("a"), makeChat("b")] });

    await user.click(await within(chatList()).findByText("Conversa b"));

    expect(await screen.findByText("pergunta b")).toBeInTheDocument();
    expect(screen.getByText("resposta b")).toBeInTheDocument();
    expect(search()).toBe("?c=b");
    expect(screen.queryByText("pergunta a")).not.toBeInTheDocument();
  });

  it("when the page opens with a chat in the URL, should load that chat", async () => {
    setup({ chats: [makeChat("a")], url: "/ai/chat?c=a" });

    expect(await screen.findByText("pergunta a")).toBeInTheDocument();
  });

  it("when the open chat is highlighted, should mark it as the current page in the list", async () => {
    setup({ chats: [makeChat("a"), makeChat("b")], url: "/ai/chat?c=b" });

    const current = await within(chatList()).findByRole("button", { current: "page" });

    expect(current).toHaveTextContent("Conversa b");
  });

  it("when the chat in the URL no longer exists, should show an error with an action to open a new chat", async () => {
    const user = userEvent.setup();
    const { search } = setup({ chats: [], url: "/ai/chat?c=sumiu" });

    expect(await screen.findByText("Não foi possível abrir esta conversa.")).toBeInTheDocument();

    // o botão do estado de erro e o da lista fazem a mesma coisa: abrir um chat novo
    await user.click(screen.getAllByRole("button", { name: /Novo chat/ }).at(-1)!);

    expect(search()).toBe("");
  });

  it("when the chat has a different provider, should ask for that provider's models", async () => {
    const { invoke } = setup({
      chats: [makeChat("a", { providerId: "gemini", modelId: "g1" })],
      url: "/ai/chat?c=a",
    });

    await screen.findByText("pergunta a");

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.ai.models)).toContainEqual({ providerId: "gemini" }),
    );
  });
});

describe("ChatPage: enviar mensagens", () => {
  it("when the first message is sent, should show it at once, then the answer, and point the URL to the new chat", async () => {
    const user = userEvent.setup();
    const { invoke, search } = setup();

    await user.type(textbox(), "  oi, tudo bem?  ");
    await user.click(sendButton());

    expect(await within(await screen.findByRole("log")).findByText("ok!")).toBeInTheDocument();
    expect(within(conversation()).getByText("oi, tudo bem?")).toBeInTheDocument();
    expect(textbox()).toHaveValue("");

    const [request] = payloadsOf(invoke, IpcChannels.chat.send) as Array<{
      chatId: string;
      message: string;
      providerId: string;
      modelId: string;
      thinking: string;
    }>;

    expect(request).toMatchObject({
      message: "oi, tudo bem?",
      providerId: "ollama",
      modelId: "m1",
      thinking: "off",
    });
    expect(request.chatId).toMatch(/^[0-9a-f-]{36}$/);
    expect(search()).toBe(`?c=${request.chatId}`);
    expect(await within(chatList()).findByText("oi, tudo bem?")).toBeInTheDocument();
  });

  it("when a second message is sent, should keep using the same chat id and show the whole conversation", async () => {
    const user = userEvent.setup();
    const { invoke } = setup();

    await user.type(textbox(), "primeira");
    await user.click(sendButton());
    await screen.findByText("ok!");

    await user.type(textbox(), "segunda");
    await user.click(sendButton());
    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.chat.send)).toHaveLength(2));

    const [first, second] = payloadsOf(invoke, IpcChannels.chat.send) as Array<{ chatId: string }>;

    expect(second.chatId).toBe(first.chatId);
    expect(await within(await screen.findByRole("log")).findByText("segunda")).toBeInTheDocument();
    expect(within(conversation()).getByText("primeira")).toBeInTheDocument();
    expect(within(conversation()).getAllByText("ok!")).toHaveLength(2);
  });

  it("when sending in an open chat, should send the id of that chat", async () => {
    const user = userEvent.setup();
    const { invoke } = setup({ chats: [makeChat("a")], url: "/ai/chat?c=a" });

    await screen.findByText("pergunta a");
    await user.type(textbox(), "mais uma");
    await user.click(sendButton());

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.chat.send)).toEqual([
        expect.objectContaining({ chatId: "a", message: "mais uma" }),
      ]),
    );
  });

  it("when the message is empty, should keep send disabled", async () => {
    setup();

    await screen.findByText(/Nenhuma conversa ainda/);
    expect(sendButton()).toBeDisabled();
  });

  it("when Enter is pressed, should send; when Shift+Enter, should not", async () => {
    const user = userEvent.setup();
    const { invoke } = setup();

    await user.type(textbox(), "a{Shift>}{Enter}{/Shift}b");
    expect(payloadsOf(invoke, IpcChannels.chat.send)).toHaveLength(0);

    await user.type(textbox(), "{Enter}");
    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.chat.send)).toHaveLength(1));
  });

  it("when sending fails, should show the error, keep the conversation as it was and put the text back in the box", async () => {
    const user = userEvent.setup();
    const { invoke } = setup({
      send: () => failure("PROVIDER_FAILED", "A requisição para o chat do Ollama falhou."),
    });

    await user.type(textbox(), "oi");
    await user.click(sendButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A requisição para o chat do Ollama falhou.",
    );
    expect(textbox()).toHaveValue("oi");
    expect(screen.queryByText("ok!")).not.toBeInTheDocument();
    expect(payloadsOf(invoke, IpcChannels.chat.send)).toHaveLength(1);
  });

  it("when sending again after a failure, should send the message normally", async () => {
    const user = userEvent.setup();
    let fail = true;

    setup({
      send: (request) =>
        fail
          ? failure("PROVIDER_FAILED", "Falhou desta vez.")
          : ok({ message: "ok!", chat: makeChat(request.chatId) }),
    });

    await user.type(textbox(), "oi");
    await user.click(sendButton());
    await screen.findByRole("alert");

    fail = false;
    await user.click(sendButton());

    await waitFor(() => expect(textbox()).toHaveValue(""));
  });

  it("when the answer is still pending, should show the sent message and block switching conversations", async () => {
    const user = userEvent.setup();

    setup({ chats: [makeChat("a")], url: "/ai/chat?c=a", send: () => new Promise(() => {}) });

    await screen.findByText("pergunta a");
    await user.type(textbox(), "demora");
    await user.click(sendButton());

    expect(await screen.findByText("demora")).toBeInTheDocument();
    expect(screen.getByText("Pensando")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Novo chat/ })).toBeDisabled();
    expect(within(chatList()).getByRole("button", { name: /^Conversa a/ })).toBeDisabled();
  });

  it("when send is clicked while waiting, should cancel, tell the main, show the status and put the text back", async () => {
    const user = userEvent.setup();
    const { invoke } = setup({
      chats: [makeChat("a")],
      url: "/ai/chat?c=a",
      send: () => new Promise(() => {}),
    });

    await screen.findByText("pergunta a");
    await user.type(textbox(), "demora");
    await user.click(sendButton());
    await screen.findByText("Pensando");
    await user.click(screen.getByRole("button", { name: "Parar geração" }));

    expect(await screen.findByText("Geração cancelada")).toBeInTheDocument();
    expect(textbox()).toHaveValue("demora");
    expect(payloadsOf(invoke, IpcChannels.chat.cancel)).toEqual([{ chatId: "a" }]);
    expect(screen.queryByText("Pensando")).not.toBeInTheDocument();
  });
});

describe("ChatPage: novo chat", () => {
  it("when New chat is clicked in an open chat, should clear the URL and show the empty state", async () => {
    const user = userEvent.setup();
    const { search } = setup({ chats: [makeChat("a")], url: "/ai/chat?c=a" });

    await screen.findByText("pergunta a");
    await user.click(screen.getByRole("button", { name: /Novo chat/ }));

    expect(search()).toBe("");
    expect(await screen.findByText("Como posso te ajudar hoje?")).toBeInTheDocument();
    expect(screen.queryByText("pergunta a")).not.toBeInTheDocument();
  });

  it("when two new chats are started and used, should send each with its own id", async () => {
    const user = userEvent.setup();
    const { invoke } = setup();

    await user.type(textbox(), "um");
    await user.click(sendButton());
    await screen.findByText("ok!");

    await user.click(screen.getByRole("button", { name: /Novo chat/ }));
    await user.type(textbox(), "dois");
    await user.click(sendButton());
    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.chat.send)).toHaveLength(2));

    const [first, second] = payloadsOf(invoke, IpcChannels.chat.send) as Array<{ chatId: string }>;

    expect(second.chatId).not.toBe(first.chatId);
  });

  it("when starting a new chat, should clear what was typed", async () => {
    const user = userEvent.setup();

    setup({ chats: [makeChat("a")], url: "/ai/chat?c=a" });

    await screen.findByText("pergunta a");
    await user.type(textbox(), "rascunho");
    await user.click(screen.getByRole("button", { name: /Novo chat/ }));

    expect(textbox()).toHaveValue("");
  });
});

describe("ChatPage: excluir conversa", () => {
  it("when the trash button is clicked and confirmed, should delete the chat and remove it from the list", async () => {
    const user = userEvent.setup();
    const { invoke } = setup({ chats: [makeChat("a"), makeChat("b")] });

    await user.click(await screen.findByRole("button", { name: "Excluir a conversa Conversa a" }));

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent('A conversa "Conversa a" será excluída');

    await user.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.chats.delete)).toEqual([{ id: "a" }]),
    );
    await waitFor(() =>
      expect(within(chatList()).queryByText("Conversa a")).not.toBeInTheDocument(),
    );
    expect(within(chatList()).getByText("Conversa b")).toBeInTheDocument();
  });

  it("when the open chat is deleted, should go back to a new chat", async () => {
    const user = userEvent.setup();
    const { search } = setup({ chats: [makeChat("a")], url: "/ai/chat?c=a" });

    await screen.findByText("pergunta a");
    await user.click(screen.getByRole("button", { name: "Excluir a conversa Conversa a" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByText("Como posso te ajudar hoje?")).toBeInTheDocument();
    expect(search()).toBe("");
  });

  it("when another chat is deleted, should keep the open one", async () => {
    const user = userEvent.setup();
    const { search } = setup({ chats: [makeChat("a"), makeChat("b")], url: "/ai/chat?c=a" });

    await screen.findByText("pergunta a");
    await user.click(screen.getByRole("button", { name: "Excluir a conversa Conversa b" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Excluir" }));

    await waitFor(() =>
      expect(within(chatList()).queryByText("Conversa b")).not.toBeInTheDocument(),
    );
    expect(screen.getByText("pergunta a")).toBeInTheDocument();
    expect(search()).toBe("?c=a");
  });

  it("when the deletion is cancelled, should keep the chat", async () => {
    const user = userEvent.setup();
    const { invoke } = setup({ chats: [makeChat("a")] });

    await user.click(await screen.findByRole("button", { name: "Excluir a conversa Conversa a" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(payloadsOf(invoke, IpcChannels.chats.delete)).toEqual([]);
    expect(within(chatList()).getByText("Conversa a")).toBeInTheDocument();
  });

  it("when deleting fails, should show the error in the dialog and keep the chat", async () => {
    const user = userEvent.setup();

    setup({ chats: [makeChat("a")] });
    mockApiFailure();

    await user.click(await screen.findByRole("button", { name: "Excluir a conversa Conversa a" }));
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível gravar");

    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(within(chatList()).getByText("Conversa a")).toBeInTheDocument();
  });
});

/** Faz o próximo `chats:delete` falhar, sem refazer toda a configuração da tela. */
function mockApiFailure() {
  const original = window.api.invoke.bind(window.api) as unknown as (
    channel: string,
    payload?: unknown,
  ) => Promise<unknown>;

  window.api.invoke = ((channel: string, payload?: unknown) =>
    channel === IpcChannels.chats.delete
      ? Promise.resolve(failure("PERSIST_FAILED", "Não foi possível gravar as conversas."))
      : original(channel, payload)) as unknown as typeof window.api.invoke;
}

describe("ChatPage: tamanho do contexto", () => {
  const bigChat = (id = "a") =>
    makeChat(id, {
      messages: [
        { id: "m1", role: "user", content: "x".repeat(4 * 900), createdAt: iso(0) },
        { id: "m2", role: "assistant", content: "y".repeat(4 * 50), createdAt: iso(0) },
      ],
    });

  it("when the chat has messages, should show a discreet estimate of the context size", async () => {
    setup({ chats: [makeChat("a")], url: "/ai/chat?c=a" });

    expect(await screen.findByTestId("context-hint")).toHaveTextContent("no contexto (estimativa)");
  });

  it("when the chat is new, should show no context estimate", async () => {
    setup();

    await screen.findByText(/Nenhuma conversa ainda/);
    expect(screen.queryByTestId("context-hint")).not.toBeInTheDocument();
  });

  it("when the conversation is small for the model, should send without any warning", async () => {
    const user = userEvent.setup();
    const { invoke } = setup({ chats: [makeChat("a")], url: "/ai/chat?c=a", contextLength: 128_000 });

    await screen.findByText("pergunta a");
    await user.type(textbox(), "oi");
    await user.click(sendButton());

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.chat.send)).toHaveLength(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("when the conversation reaches 80% of the model limit, should warn before sending and send nothing yet", async () => {
    const user = userEvent.setup();
    const { invoke } = setup({ chats: [bigChat()], url: "/ai/chat?c=a", contextLength: 1_000 });

    await screen.findAllByText(/x{20}/);
    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.ai.models).length).toBeGreaterThan(0));
    await screen.findByTestId("context-hint");
    await user.type(textbox(), "mais uma pergunta");
    await user.click(sendButton());

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent("Esta conversa está grande");
    expect(dialog).toHaveTextContent("do limite do modelo");
    expect(payloadsOf(invoke, IpcChannels.chat.send)).toEqual([]);
  });

  it("when warned and the user chooses to send anyway, should send the message", async () => {
    const user = userEvent.setup();
    const { invoke } = setup({ chats: [bigChat()], url: "/ai/chat?c=a", contextLength: 1_000 });

    await screen.findByTestId("context-hint");
    await user.type(textbox(), "mais uma pergunta");
    await user.click(sendButton());
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Enviar mesmo assim" }));

    await waitFor(() =>
      expect(payloadsOf(invoke, IpcChannels.chat.send)).toEqual([
        expect.objectContaining({ chatId: "a", message: "mais uma pergunta" }),
      ]),
    );
  });

  it("when warned and the user chooses a new chat, should open an empty chat keeping the typed text and send nothing", async () => {
    const user = userEvent.setup();
    const { invoke, search } = setup({ chats: [bigChat()], url: "/ai/chat?c=a", contextLength: 1_000 });

    await screen.findByTestId("context-hint");
    await user.type(textbox(), "mais uma pergunta");
    await user.click(sendButton());
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Começar um chat novo" }));

    await waitFor(() => expect(search()).toBe(""));
    expect(textbox()).toHaveValue("mais uma pergunta");
    expect(payloadsOf(invoke, IpcChannels.chat.send)).toEqual([]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("when warned and the user cancels, should keep everything as it was and send nothing", async () => {
    const user = userEvent.setup();
    const { invoke, search } = setup({ chats: [bigChat()], url: "/ai/chat?c=a", contextLength: 1_000 });

    await screen.findByTestId("context-hint");
    await user.type(textbox(), "mais uma pergunta");
    await user.click(sendButton());
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Cancelar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(textbox()).toHaveValue("mais uma pergunta");
    expect(search()).toBe("?c=a");
    expect(payloadsOf(invoke, IpcChannels.chat.send)).toEqual([]);
  });

  it("when the model limit is unknown and the conversation is still small, should not warn", async () => {
    const user = userEvent.setup();
    const { invoke } = setup({ chats: [bigChat()], url: "/ai/chat?c=a", contextLength: 0 });

    await screen.findByTestId("context-hint");
    await user.type(textbox(), "mais uma pergunta");
    await user.click(sendButton());

    await waitFor(() => expect(payloadsOf(invoke, IpcChannels.chat.send)).toHaveLength(1));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("when the model limit is unknown and the conversation passes 100 thousand tokens, should warn without a percentage", async () => {
    const user = userEvent.setup();
    const huge = makeChat("a", {
      messages: [{ id: "m1", role: "user", content: "z".repeat(4 * 100_000), createdAt: iso(0) }],
    });

    setup({ chats: [huge], url: "/ai/chat?c=a", contextLength: 0 });

    await screen.findByTestId("context-hint");
    await user.type(textbox(), "oi");
    await user.click(sendButton());

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toHaveTextContent("Esta conversa está grande");
    expect(dialog).not.toHaveTextContent("do limite do modelo");
    act(() => undefined);
  });
});
