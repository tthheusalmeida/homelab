import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import type { RecordImportResult, RestoreMode } from '../../../shared/contracts/backup';
import type {
  ChatDetail,
  ChatMessage,
  ChatReference,
  ChatSendRequest,
  ChatSendResponse,
  ChatSummary,
} from '../../../shared/contracts/chat';
import { historyBudget, summaryCut, type ChatDigest } from '../../../shared/chat-history';
import { IpcError, IpcErrorCode } from '../../../shared/errors';
import { AIService } from '../ai/ai.service';

import {
  CHAT_CONTEXT,
  boldCitations,
  groupBySection,
  referencesFor,
  withContext,
  withoutDeadEnds,
  type ChatContextPassage,
  type ChatContextSource,
} from './chat-context';
import { digestPrompt, digestTurns, historyTurns } from './chat-digest';
import { titleFromMessage } from './chat.title';
import { isStoredChat } from './file-chat.repository';
import { CHAT_REPOSITORY, type ChatRepository } from './chat.repository';
import type { StoredChat } from './chat.model';

export const ChatMessages = {
  emptyMessage: 'Escreva uma mensagem antes de enviar.',
  invalidId: 'Identificador de chat inválido.',
  busy: 'Já há uma resposta sendo gerada neste chat. Aguarde ou cancele antes de enviar outra.',
  cancelled: 'A resposta foi cancelada.',
  deletedWhileWaiting: 'O chat foi excluído enquanto a resposta era gerada.',
  notFound: (id: string) => `Chat "${id}" não encontrado.`,
} as const;

const CHAT_ID_FORMAT = /^[A-Za-z0-9_-]{1,100}$/;

function cancelledError(): IpcError {
  return new IpcError(IpcErrorCode.VALIDATION, ChatMessages.cancelled);
}

function summarize(chat: StoredChat): ChatSummary {
  const { messages, ...rest } = chat;

  return { ...rest, messageCount: messages.length };
}

/**
 * Chats com histórico. A cada envio o histórico vai ao provedor; quando passa do que o modelo aguenta,
 * o começo vira um resumo gravado no chat (ver `summarize`). A pergunta e a resposta só são gravadas **juntas, em caso de sucesso**: se o provedor
 * falha, o chat não muda. Cancelar interrompe a chamada ao provedor e descarta o que chegar.
 */
@Injectable()
export class ChatService {
  private readonly inFlight = new Map<string, AbortController>();
  private readonly cancelled = new Set<string>();

  constructor(
    private readonly aiService: AIService,
    @Inject(CHAT_REPOSITORY) private readonly repository: ChatRepository,
    /** Páginas da biblioteca que acompanham a pergunta. Sem ela, o chat funciona como antes. */
    @Optional() @Inject(CHAT_CONTEXT) private readonly context?: ChatContextSource,
  ) {}

  /** Do mais recente para o mais antigo. */
  list(): ChatSummary[] {
    return this.repository
      .findAll()
      .map(summarize)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id.localeCompare(a.id));
  }

  get(id: string): ChatDetail {
    const chat = this.repository.findById(id);

    if (!chat) {
      throw new NotFoundException(ChatMessages.notFound(id));
    }

    return chat;
  }

  delete(id: string): void {
    if (!this.repository.remove(id)) {
      throw new NotFoundException(ChatMessages.notFound(id));
    }
  }

  /** O que aconteceu com o arquivo de conversas ao abrir o app (cópia usada, arquivo ilegível). */
  startupReport() {
    return this.repository.startupReport();
  }

  /** Todas as conversas, no formato de disco (usado pelo backup). */
  exportChats(): StoredChat[] {
    return this.repository.findAll();
  }

  /**
   * Traz conversas de um backup. `merge` só adiciona as que não existem; `replace` troca todas
   * (menos a que está esperando resposta agora). Entradas inválidas são ignoradas.
   */
  importChats(raw: unknown[], mode: RestoreMode): RecordImportResult {
    const incoming = raw.filter(isStoredChat);

    if (mode === 'replace') {
      this.repository
        .findAll()
        .filter((chat) => !this.inFlight.has(chat.id))
        .forEach((chat) => this.repository.remove(chat.id));
    }

    let added = 0;

    for (const chat of incoming) {
      if (this.repository.findById(chat.id)) {
        continue;
      }

      this.repository.save(chat);
      added += 1;
    }

    return { added, skipped: raw.length - added };
  }

  /** Marca a resposta em andamento do chat para ser descartada quando chegar. */
  cancel(chatId: string): void {
    const running = this.inFlight.get(chatId);

    if (running) {
      this.cancelled.add(chatId);
      running.abort();
    }
  }

  async send(
    request: ChatSendRequest,
    /** Recebe o texto da resposta aos pedaços, conforme o modelo o escreve (quando o provedor transmite). */
    onChunk?: (text: string) => void,
  ): Promise<ChatSendResponse> {
    const message = request.message.trim();

    if (!CHAT_ID_FORMAT.test(request.chatId ?? '')) {
      throw new BadRequestException(ChatMessages.invalidId);
    }

    if (message === '') {
      throw new BadRequestException(ChatMessages.emptyMessage);
    }

    if (this.inFlight.has(request.chatId)) {
      throw new BadRequestException(ChatMessages.busy);
    }

    const existing = this.repository.findById(request.chatId);

    const controller = new AbortController();

    this.inFlight.set(request.chatId, controller);
    this.cancelled.delete(request.chatId);

    try {
      const cut = this.digestCut(request, existing);
      const digest = cut === null ? existing?.digest : await this.summarize(request, existing, cut);
      const history = historyTurns(existing?.messages ?? [], digest);
      const passages = await this.passagesFor(message, existing, {
        contextLimit: request.contextLimit,
        modelBillions: request.modelBillions,
      });
      let answer: string;

      try {
        answer = await this.aiService.chat({
          message,
          modelId: request.modelId,
          providerId: request.providerId,
          thinking: request.thinking,
          signal: controller.signal,
          // Cancelado, nada mais chega à tela: o resto do que o modelo escrever é jogado fora.
          ...(onChunk
            ? { onChunk: (text: string) => this.cancelled.has(request.chatId) || onChunk(text) }
            : {}),
          // Com páginas relevantes, as perguntas antigas respondidas com "não encontrei" ficam de fora.
          messages: [
            ...digestTurns(digest),
            ...(passages.length > 0 ? withoutDeadEnds(history) : history),
            { role: 'user', content: withContext(message, passages) },
          ],
        });
      } catch (error) {
        throw this.cancelled.has(request.chatId) ? cancelledError() : error;
      }

      if (this.cancelled.has(request.chatId)) {
        throw cancelledError();
      }

      return this.record(
        request,
        existing,
        message,
        // as marcas [n] ficam em negrito, como **[1]**, para se destacarem no texto
        boldCitations(answer, groupBySection(passages).length),
        referencesFor(answer, passages),
        digest,
      );
    } finally {
      this.inFlight.delete(request.chatId);
      this.cancelled.delete(request.chatId);
    }
  }

  /**
   * Resumo do começo da conversa quando o histórico passou do que o modelo aguenta (ver
   * `historyBudget`). O resumo é feito uma vez e **gravado no chat**: os envios seguintes só o
   * reaproveitam, e ele só é refeito (incluindo o anterior) quando o histórico volta a crescer.
   * Se a IA falhar ao resumir, o chat segue com o histórico inteiro.
   */
  private digestCut(request: ChatSendRequest, existing: StoredChat | null): number | null {
    return summaryCut(
      existing?.messages ?? [],
      existing?.digest,
      historyBudget(request.contextLimit, request.modelBillions),
    );
  }

  private async summarize(
    request: ChatSendRequest,
    existing: StoredChat | null,
    cut: number,
  ): Promise<ChatDigest | undefined> {
    const messages = existing?.messages ?? [];

    try {
      const covered = existing?.digest?.upTo ?? 0;
      const text = await this.aiService.chat({
        message: digestPrompt(existing?.digest?.text, messages.slice(covered, cut)),
        modelId: request.modelId,
        providerId: request.providerId,
        signal: this.inFlight.get(request.chatId)?.signal,
      });

      return text.trim() === '' ? existing?.digest : { text: text.trim(), upTo: cut };
    } catch {
      return existing?.digest;
    }
  }

  /**
   * Trechos das páginas que acompanham a pergunta. A busca é um **extra**: se falhar, o chat segue
   * sem contexto em vez de deixar de responder.
   */
  private async passagesFor(
    message: string,
    existing: StoredChat | null,
    model: { contextLimit?: number; modelBillions?: number },
  ): Promise<ChatContextPassage[]> {
    const previous = existing?.messages.filter(({ role }) => role === 'user').at(-1)?.content;

    try {
      return (await this.context?.retrieve(message, previous, model)) ?? [];
    } catch {
      return [];
    }
  }

  /** Grava pergunta e resposta juntas no chat (criando-o na primeira mensagem). */
  private record(
    request: ChatSendRequest,
    existing: StoredChat | null,
    message: string,
    answer: string,
    references: ChatReference[],
    digest?: ChatDigest,
  ): ChatSendResponse {
    if (existing && !this.repository.findById(existing.id)) {
      throw new NotFoundException(ChatMessages.deletedWhileWaiting);
    }

    const current = existing ? (this.repository.findById(existing.id) ?? existing) : null;
    const now = new Date().toISOString();
    const turn = (
      role: ChatMessage['role'],
      content: string,
      cited: ChatReference[] = [],
    ): ChatMessage => ({
      id: uuidv7(),
      role,
      content,
      createdAt: now,
      ...(cited.length > 0 ? { references: cited } : {}),
    });

    const chat: StoredChat = {
      id: request.chatId,
      title: current?.title ?? titleFromMessage(message),
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      providerId: request.providerId,
      modelId: request.modelId,
      ...(request.thinking !== undefined ? { thinking: request.thinking } : {}),
      messageCount: (current?.messages.length ?? 0) + 2,
      ...(digest ? { digest } : {}),
      messages: [
        ...(current?.messages ?? []),
        turn('user', message),
        turn('assistant', answer, references),
      ],
    };

    this.repository.save(chat);

    return { message: answer, chat };
  }
}
