import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';

import type { RecordImportResult, RestoreMode } from '../../../shared/contracts/backup';
import type {
  ChatDetail,
  ChatMessage,
  ChatSendRequest,
  ChatSendResponse,
  ChatSummary,
} from '../../../shared/contracts/chat';
import { IpcError, IpcErrorCode } from '../../../shared/errors';
import { AIService } from '../ai/ai.service';

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

function summarize(chat: StoredChat): ChatSummary {
  const { messages, ...rest } = chat;

  return { ...rest, messageCount: messages.length };
}

/**
 * Chats com histórico. A cada envio o histórico **inteiro** vai ao provedor (mais tokens, de
 * propósito). A pergunta e a resposta só são gravadas **juntas, em caso de sucesso**: se o provedor
 * falha, o chat não muda. Cancelar descarta a resposta quando ela chegar (a chamada ao provedor não
 * é interrompida, então os tokens são gastos).
 */
@Injectable()
export class ChatService {
  private readonly inFlight = new Set<string>();
  private readonly cancelled = new Set<string>();

  constructor(
    private readonly aiService: AIService,
    @Inject(CHAT_REPOSITORY) private readonly repository: ChatRepository,
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
    if (this.inFlight.has(chatId)) {
      this.cancelled.add(chatId);
    }
  }

  async send(request: ChatSendRequest): Promise<ChatSendResponse> {
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

    this.inFlight.add(request.chatId);
    this.cancelled.delete(request.chatId);

    try {
      const history = (existing?.messages ?? []).map(({ role, content }) => ({ role, content }));
      const answer = await this.aiService.chat({
        message,
        modelId: request.modelId,
        providerId: request.providerId,
        thinking: request.thinking,
        messages: [...history, { role: 'user', content: message }],
      });

      if (this.cancelled.has(request.chatId)) {
        throw new IpcError(IpcErrorCode.VALIDATION, ChatMessages.cancelled);
      }

      return this.record(request, existing, message, answer);
    } finally {
      this.inFlight.delete(request.chatId);
      this.cancelled.delete(request.chatId);
    }
  }

  /** Grava pergunta e resposta juntas no chat (criando-o na primeira mensagem). */
  private record(
    request: ChatSendRequest,
    existing: StoredChat | null,
    message: string,
    answer: string,
  ): ChatSendResponse {
    if (existing && !this.repository.findById(existing.id)) {
      throw new NotFoundException(ChatMessages.deletedWhileWaiting);
    }

    const current = existing ? (this.repository.findById(existing.id) ?? existing) : null;
    const now = new Date().toISOString();
    const turn = (role: ChatMessage['role'], content: string): ChatMessage => ({
      id: uuidv7(),
      role,
      content,
      createdAt: now,
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
      messages: [...(current?.messages ?? []), turn('user', message), turn('assistant', answer)],
    };

    this.repository.save(chat);

    return { message: answer, chat };
  }
}
