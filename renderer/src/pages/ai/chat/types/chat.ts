import type { ChatReference } from "#shared/contracts/chat";

export interface AiOption {
  id: string;
  label: string;
}

export interface AiProvider extends AiOption {}

export interface AiModel extends AiOption {
  providerId: string;
  contextWindow?: number;
  /** Detalhes que o main devolve em `ai:models` (o limite de entrada fica em `context_length`). */
  details?: { context_length?: number; parameter_size?: string };
}

export interface AiThinkingOption extends AiOption {
  description?: string;
}

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Páginas da biblioteca em que a resposta se apoiou (só nas respostas do assistente). */
  references?: ChatReference[];
  /** A pergunta parecia ser sobre as páginas e nenhuma serviu de referência (só nas respostas do assistente). */
  notInPages?: boolean;
}

export interface AiChatRequest {
  chatId: string;
  providerId: string;
  modelId: string;
  thinking?: string;
  message: string;
  /** Janela de contexto do modelo, em tokens, quando conhecida (o main escolhe quantos trechos enviar). */
  contextLimit?: number;
  /** Tamanho do modelo em bilhões de parâmetros, quando conhecido (modelo pequeno recebe menos trechos). */
  modelBillions?: number;
}

export type ChatStatus = "idle" | "sending" | "cancelled";
