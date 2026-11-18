import type { AIChatTurn, AIProviderName, AIRetryInfo } from '../ai.model';

export class AiChatDto {
  message!: string;

  modelId!: string;

  providerId!: AIProviderName;

  thinking?: string;

  /** Conversa inteira, com a mensagem nova por último; sem ela vale só `message`. */
  messages?: AIChatTurn[];

  /** Chamado antes de cada nova tentativa automática do provedor. */
  onRetry?: (info: AIRetryInfo) => void;
}
