import type { AiProviderId } from './ai';

/** Payload de `chat:send` (mesmo corpo do `POST chat` de hoje). */
export interface ChatSendRequest {
  message: string;
  modelId: string;
  providerId: AiProviderId;
  thinking?: string;
}

export interface ChatSendResponse {
  message: string;
}
