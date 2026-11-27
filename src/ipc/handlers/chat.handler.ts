import { IpcChannels } from '../../shared/channels';
import type {
  ChatDetail,
  ChatSendRequest,
  ChatSendResponse,
  ChatSummary,
} from '../../shared/contracts/chat';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcEvents } from '../../shared/events';
import type { EventPublisher } from '../event-publisher';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

import { ChunkBatcher } from './chunk-batcher';

/** Porta do `ChatService` do back. */
export interface ChatSource {
  send(request: ChatSendRequest, onChunk?: (text: string) => void): Promise<ChatSendResponse>;
  cancel(chatId: string): void;
  list(): ChatSummary[];
  get(id: string): ChatDetail;
  delete(id: string): void;
}

/**
 * Canais `chat:*` (enviar e cancelar) e `chats:*` (lista, um chat e excluir). Falha do provider
 * (Gemini ou Ollama) vira `PROVIDER_FAILED` com a mensagem em português de hoje; provider sem
 * configuração já chega como `NOT_CONFIGURED` (`IpcError`); chat inexistente chega como 404
 * (`NOT_FOUND`) e mensagem vazia ou id inválido como 400 (`VALIDATION`), pelo `IpcErrorMapper`.
 */
export class ChatHandler extends IpcHandler {
  constructor(
    private readonly chat: ChatSource,
    /** Por onde o texto da resposta segue para a tela aos pedaços; sem ele, a resposta chega inteira. */
    private readonly events?: EventPublisher,
  ) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.chat.send, (request) => this.send(request)),
      this.route(IpcChannels.chat.cancel, ({ chatId }) => this.chat.cancel(chatId)),
      this.route(IpcChannels.chats.list, () => this.chat.list()),
      this.route(IpcChannels.chats.get, ({ id }) => this.chat.get(id)),
      this.route(IpcChannels.chats.delete, ({ id }) => this.chat.delete(id)),
    ];
  }

  private async send(request: ChatSendRequest): Promise<ChatSendResponse> {
    const events = this.events;
    const batcher = events
      ? new ChunkBatcher((text) =>
          events.publish(IpcEvents.chatChunk, { chatId: request.chatId, text }),
        )
      : null;

    try {
      const response = await this.chat.send(
        request,
        batcher ? (text) => batcher.push(text) : undefined,
      );

      batcher?.flush();

      return response;
    } catch (error) {
      batcher?.stop();

      if (error instanceof IpcError || isClientError(error)) {
        throw error;
      }

      throw new IpcError(
        IpcErrorCode.PROVIDER_FAILED,
        error instanceof Error ? error.message : undefined,
      );
    }
  }
}

/**
 * Erro de quem pediu (400 e 404 do Nest: mensagem vazia, id inválido, chat excluído enquanto a
 * resposta era gerada): não é falha do provedor e segue com o código que o mapper já sabe.
 */
function isClientError(error: unknown): boolean {
  const status = (error as { getStatus?: () => number } | null)?.getStatus?.();

  return status === 400 || status === 404;
}
