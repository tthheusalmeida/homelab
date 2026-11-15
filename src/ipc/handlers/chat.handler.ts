import { IpcChannels } from '../../shared/channels';
import type { ChatSendRequest, ChatSendResponse } from '../../shared/contracts/chat';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta do `ChatService` do back. */
export interface ChatSource {
  chat(request: ChatSendRequest): Promise<ChatSendResponse>;
}

/**
 * Canal `chat:send`. Falha do provider (Gemini ou Ollama) vira `PROVIDER_FAILED` com a mensagem
 * em português de hoje; provider sem configuração já chega como `NOT_CONFIGURED` (`IpcError`).
 */
export class ChatHandler extends IpcHandler {
  constructor(private readonly chat: ChatSource) {
    super();
  }

  routes(): IpcRoute[] {
    return [this.route(IpcChannels.chat.send, (request) => this.send(request))];
  }

  private async send(request: ChatSendRequest): Promise<ChatSendResponse> {
    try {
      return await this.chat.chat(request);
    } catch (error) {
      if (error instanceof IpcError) {
        throw error;
      }

      throw new IpcError(
        IpcErrorCode.PROVIDER_FAILED,
        error instanceof Error ? error.message : undefined,
      );
    }
  }
}
