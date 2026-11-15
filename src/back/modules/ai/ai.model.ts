import { HealthCheck } from '../health/health.model';

export type AIProviderName = 'ollama' | 'gemini';

export interface AIThinkingOption {
  id: string;
  label: string;
}

export interface AIProviderInfo {
  id: AIProviderName;
  label: string;
}

export interface AIProviderModelDetails {
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
  context_length: number;
  embedding_length: number;
}

export interface AIProviderModel {
  name: string;
  provider: AIProviderName;
  model: string;
  size: number;
  details: AIProviderModelDetails;
  capabilities: string[];
  thinking?: AIThinkingOption[];
}

/** Uma fala da conversa enviada ao provedor. */
export interface AIChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIChatRequest {
  message: string;
  model: string;
  thinking?: string;
  /**
   * Conversa inteira (incluindo a mensagem nova, que é a última). Quando existe, o provedor a usa
   * no lugar de `message`; sem ela vale só `message` (jobs de resumo, que são de uma mensagem só).
   */
  messages?: AIChatTurn[];
}

export interface AIProvider {
  readonly name: AIProviderName;

  health(): Promise<HealthCheck>;

  chat(request: AIChatRequest): Promise<string>;

  models(): Promise<AIProviderModel[]>;

  thinking(model: string): Promise<AIThinkingOption[]>;
}
