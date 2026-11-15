export interface AiOption {
  id: string;
  label: string;
}

export interface AiProvider extends AiOption {}

export interface AiModel extends AiOption {
  providerId: string;
  contextWindow?: number;
  /** Detalhes que o main devolve em `ai:models` (o limite de entrada fica em `context_length`). */
  details?: { context_length?: number };
}

export interface AiThinkingOption extends AiOption {
  description?: string;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface AiChatRequest {
  chatId: string;
  providerId: string;
  modelId: string;
  thinking: string;
  message: string;
}

export type ChatStatus = "idle" | "sending" | "cancelled";
