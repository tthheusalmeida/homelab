import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import type { ChatSummary } from "#shared/contracts/chat";
import { contextOverheadTokens } from "#shared/rag-budget";
import {
  checkContext,
  estimateConversationTokens,
  type ContextCheck,
} from "#shared/tokens";
import { ConfirmDialog } from "#components/ConfirmDialog";
import { ErrorState } from "#components/ErrorState";
import { PageHeader } from "#components/PageHeader";

import type { AiMessage, ChatStatus } from "./types/chat";

import {
  contextPercent,
  formatTokens,
  modelContextLimit,
  modelParameterBillions,
} from "./context";
import { ChatStrings } from "./strings";

import { useAiSelection } from "./hooks/useAiSelection";
import { useAiChat } from "./hooks/useAiChat";
import { useChat, useChats, useDeleteChat } from "./hooks/useChats";

import { ChatEmptyState } from "./components/ChatEmptyState";
import { ChatList } from "./components/ChatList";
import { ChatMessageList } from "./components/ChatMessageList";
import { ChatComposer } from "./components/ChatComposer";
import { ChatSettings } from "./components/ChatSettings";
import { ContextWarningDialog } from "./components/ContextWarningDialog";
import { useSnackbar } from "#components/Snackbar";

/** Parâmetro da URL com o chat aberto; sem ele, é um chat novo (que só é salvo ao enviar). */
const CHAT_PARAM = "c";

const NO_MESSAGES: AiMessage[] = [];

const newChatId = () => crypto.randomUUID();

export function ChatPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlChatId = searchParams.get(CHAT_PARAM) ?? undefined;

  // Id do chat novo: criado aqui, e o main o grava junto com a primeira mensagem.
  const [draftId, setDraftId] = useState(newChatId);
  const chatId = urlChatId ?? draftId;

  const [chatStatus, setChatStatus] = useState<ChatStatus>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  /**
   * Mensagem enviada que ainda não voltou gravada: aparece na hora, como se já estivesse no chat.
   * `baseCount` é quantas mensagens o chat tinha ao enviar: assim que o histórico gravado cresce, a
   * pendente some sozinha (sem aparecer duas vezes por um instante).
   */
  const [pending, setPending] = useState<{ content: string; baseCount: number } | null>(null);

  const [message, setMessage] = useState("");
  const [warning, setWarning] = useState<{ check: ContextCheck; content: string } | null>(null);
  const [chatToDelete, setChatToDelete] = useState<ChatSummary | null>(null);

  const { sendMessage, abort, isSending } = useAiChat();

  const chatsQuery = useChats();
  const chatQuery = useChat(urlChatId);
  const deleteChat = useDeleteChat();
  const snackbar = useSnackbar();
  const chat = chatQuery.data;

  // O que o usuário escolheu manda; senão vale o que o chat usou por último; senão o primeiro.
  const ai = useAiSelection({ last: chat, pickFirst: true });
  const activeProviderId = ai.providerId;
  const activeModelId = ai.modelId;
  const activeThinkingId = ai.thinkingId;

  const history = chat?.messages ?? NO_MESSAGES;
  const showPending = pending !== null && history.length === pending.baseCount;
  const pendingContent = showPending ? pending.content : null;
  const messages = useMemo<AiMessage[]>(
    () =>
      pendingContent === null
        ? history
        : [...history, { id: "pending", role: "user", content: pendingContent }],
    [history, pendingContent],
  );

  const modelLimit = modelContextLimit(ai.activeModel);
  // Cada envio soma ao histórico os trechos das páginas da biblioteca (o main os escolhe, por janela).
  const modelBillions = modelParameterBillions(ai.activeModel);
  const pagesTokens = contextOverheadTokens(modelLimit, modelBillions);
  const contextHint =
    history.length > 0
      ? ChatStrings.contextHint(
          formatTokens(estimateConversationTokens(history, message) + pagesTokens),
        )
      : undefined;

  /** Volta ao estado inicial de uma conversa: nada escolhido à mão, nada em andamento. */
  function resetConversation() {
    ai.reset();
    setPending(null);
    setSendError(null);
    setChatStatus("idle");
    setWarning(null);
  }

  function openChat(id: string) {
    resetConversation();
    setMessage("");
    setSearchParams({ [CHAT_PARAM]: id });
  }

  /** Chat novo; `keepMessage` leva o texto já escrito junto (ex.: vindo do aviso de conversa grande). */
  function startNewChat(keepMessage = false) {
    resetConversation();

    if (!keepMessage) {
      setMessage("");
    }

    setDraftId(newChatId());
    setSearchParams({});
  }

  async function submit(content: string) {
    if (!activeProviderId || !activeModelId || !ai.thinkingReady) {
      return;
    }

    setWarning(null);
    setPending({ content, baseCount: history.length });
    setMessage("");
    setSendError(null);
    setChatStatus("sending");

    try {
      const response = await sendMessage({
        chatId,
        providerId: activeProviderId,
        modelId: activeModelId,
        thinking: activeThinkingId,
        message: content,
        contextLimit: modelLimit ?? undefined,
        modelBillions: modelBillions ?? undefined,
      });

      setPending(null);
      setChatStatus("idle");

      // O chat novo passou a existir: a URL passa a apontar para ele.
      if (!urlChatId) {
        setSearchParams({ [CHAT_PARAM]: response.chat.id }, { replace: true });
      }
    } catch (error) {
      setPending(null);
      // A pergunta não foi gravada: o texto volta ao campo para ajustar ou tentar de novo.
      setMessage(content);

      if (error instanceof DOMException && error.name === "AbortError") {
        setChatStatus("cancelled");
        return;
      }

      setChatStatus("idle");
      setSendError(error instanceof Error && error.message ? error.message : ChatStrings.sendFailed);
    }
  }

  async function handleSend() {
    if (isSending) {
      abort();
      setChatStatus("cancelled");
      return;
    }

    const content = message.trim();

    if (!content) {
      return;
    }

    if (!activeProviderId || !activeModelId || !ai.thinkingReady) {
      return;
    }

    // Conversa grande: avisa antes de enviar (cada envio reenvia tudo e custa tokens).
    const check = checkContext(
      estimateConversationTokens(history, content) + pagesTokens,
      modelLimit,
    );

    if (check.shouldWarn) {
      setWarning({ check, content });
      return;
    }

    await submit(content);
  }

  function confirmDelete() {
    if (!chatToDelete) {
      return;
    }

    const { id } = chatToDelete;

    deleteChat.mutate(id, {
      onSuccess: () => {
        setChatToDelete(null);
        snackbar.success("Conversa excluída");

        if (id === urlChatId) {
          startNewChat();
        }
      },
      onError: (error) => snackbar.error(error.message),
    });
  }

  const isLoading =
    ai.isLoadingProviders || ai.isLoadingModels || ai.isLoadingThinking;

  const canSend =
    Boolean(message.trim()) &&
    Boolean(activeProviderId) &&
    Boolean(activeModelId) &&
    ai.thinkingReady &&
    !isLoading &&
    !isSending;

  const showMessages = messages.length > 0 || chatStatus !== "idle" || sendError !== null;

  // O AppLayout não rola nesta rota: a raiz ocupa a área útil e só a lista de conversas e o
  // conteúdo da conversa rolam; o campo de mensagem fica sempre à vista.
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {/* Sem frase de descrição e com os seletores da IA na linha do título: mais altura para a conversa. */}
      <PageHeader title="Conversa" command="ai --chat" actions={<ChatSettings {...ai} />} />

      <div className="flex min-h-0 flex-1 gap-3">
      <ChatList
        chats={chatsQuery.data}
        isLoading={chatsQuery.isLoading}
        isError={chatsQuery.isError}
        activeId={urlChatId}
        disabled={isSending}
        onSelect={openChat}
        onNew={() => startNewChat()}
        onDelete={setChatToDelete}
        onRetry={() => void chatsQuery.refetch()}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {urlChatId && chatQuery.isError ? (
          <div className="flex flex-1 items-center justify-center">
            <ErrorState
              primaryMessage={ChatStrings.loadChatFailed}
              actionLabel={ChatStrings.newChat}
              secondaryMessage={chatQuery.error.message}
              action={() => startNewChat()}
            />
          </div>
        ) : showMessages ? (
          <ChatMessageList messages={messages} status={chatStatus} error={sendError} />
        ) : (
          <ChatEmptyState />
        )}

        <ChatComposer
          value={message}
          onChange={setMessage}
          onSend={handleSend}
          disabled={!canSend && !isSending}
          isSending={isSending}
          contextHint={contextHint}
        />
      </div>

      <ContextWarningDialog
        open={warning !== null}
        tokens={formatTokens(warning?.check.estimatedTokens ?? 0)}
        percent={warning ? contextPercent(warning.check) : null}
        onCancel={() => setWarning(null)}
        onNewChat={() => startNewChat(true)}
        onSend={() => warning && void submit(warning.content)}
      />

      <ConfirmDialog
        open={chatToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteChat.isPending) {
            deleteChat.reset();
            setChatToDelete(null);
          }
        }}
        title={ChatStrings.deleteTitle}
        description={ChatStrings.deleteDescription(chatToDelete?.title ?? "")}
        confirmLabel={ChatStrings.deleteConfirm}
        destructive
        isPending={deleteChat.isPending}
        errorMessage={deleteChat.isError ? deleteChat.error.message : undefined}
        onConfirm={confirmDelete}
      />
      </div>
    </div>
  );
}
