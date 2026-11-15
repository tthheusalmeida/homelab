import type { AiProviderId } from './ai';

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

/** Item da lista de chats (canal `chats:list`), do mais recente para o mais antigo. */
export interface ChatSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  /** Provedor, modelo e raciocínio do último envio: a tela os restaura ao abrir o chat. */
  providerId: AiProviderId;
  modelId: string;
  thinking?: string;
  messageCount: number;
}

/** Chat inteiro, com todas as mensagens (canais `chats:get` e `chat:send`). */
export interface ChatDetail extends ChatSummary {
  messages: ChatMessage[];
}

export interface ChatRequest {
  id: string;
}

/**
 * Payload de `chat:send`. O `chatId` é criado pela tela ao abrir um chat novo (uuid); se ainda não
 * existe, o chat nasce com a primeira mensagem. O histórico inteiro é reenviado ao provedor.
 */
export interface ChatSendRequest {
  chatId: string;
  message: string;
  modelId: string;
  providerId: AiProviderId;
  thinking?: string;
}

export interface ChatSendResponse {
  /** Resposta do modelo (a última mensagem do chat). */
  message: string;
  chat: ChatDetail;
}

/** Payload de `chat:cancel`: descarta a resposta que ainda está sendo gerada para esse chat. */
export interface ChatCancelRequest {
  chatId: string;
}
