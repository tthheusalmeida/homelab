import type { AIChatTurn, AIProviderName } from '../ai.model';

export class AiChatDto {
  message!: string;

  modelId!: string;

  providerId!: AIProviderName;

  thinking?: string;

  /** Conversa inteira, com a mensagem nova por último; sem ela vale só `message`. */
  messages?: AIChatTurn[];
}
