import type { AIChatTurn, AIProviderName, AIRetryInfo } from '../ai.model';

export class AiChatDto {
  message!: string;

  modelId!: string;

  providerId!: AIProviderName;

  thinking?: string;

  /** A resposta precisa ser um JSON: o provedor liga o modo de resposta em JSON, quando existe. */
  json?: boolean;

  /** Conversa inteira, com a mensagem nova por último; sem ela vale só `message`. */
  messages?: AIChatTurn[];

  /** Chamado antes de cada nova tentativa automática do provedor. */
  onRetry?: (info: AIRetryInfo) => void;
}
