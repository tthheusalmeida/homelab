import type { AIProviderName } from '../ai.model';

export class AiChatDto {
  message!: string;

  modelId!: string;

  providerId!: AIProviderName;

  thinking?: string;
}
