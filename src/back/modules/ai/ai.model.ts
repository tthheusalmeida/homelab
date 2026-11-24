import type { AiProviderId } from '../../../shared/contracts/ai';
import { HealthCheck } from '../health/health.model';

export type AIProviderName = AiProviderId;

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

/** O provedor falhou por um motivo passageiro e vai tentar de novo. */
export interface AIRetryInfo {
  /** Tentativa que vai começar (2 é a primeira repetição). */
  attempt: number;
  maxAttempts: number;
  /** Espera antes da nova tentativa. */
  delayMs: number;
  /** Motivo da falha, em português. */
  reason: string;
  /** A tentativa vai usar outro modelo (o mais barato), porque o escolhido não respondeu. */
  fallback?: boolean;
}

export interface AIChatRequest {
  message: string;
  model: string;
  thinking?: string;
  /** A resposta precisa ser um JSON: liga o modo de resposta em JSON do provedor, quando existe. */
  json?: boolean;
  /** Chamado antes de cada nova tentativa automática (para mostrar "tentando de novo"). */
  onRetry?: (info: AIRetryInfo) => void;
  /** Cancela a chamada em andamento (e as esperas entre tentativas). */
  signal?: AbortSignal;
  /**
   * Conversa inteira (incluindo a mensagem nova, que é a última). Quando existe, o provedor a usa
   * no lugar de `message`; sem ela vale só `message` (jobs de resumo, que são de uma mensagem só).
   */
  messages?: AIChatTurn[];
}

export interface AIProvider {
  readonly name: AIProviderName;
  /** Nome mostrado ao usuário (ex.: "Gemini"). */
  readonly label: string;
  /** Modelo mais barato do catálogo do provider; `undefined` quando ele não tem catálogo de preços (Ollama). */
  cheapestModel?(): string | undefined;

  health(): Promise<HealthCheck>;

  chat(request: AIChatRequest): Promise<string>;

  models(): Promise<AIProviderModel[]>;

  thinking(model: string): Promise<AIThinkingOption[]>;
}
