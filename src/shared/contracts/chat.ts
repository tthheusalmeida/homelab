import type { ChatDigest } from '../chat-history';
import type { AiProviderId } from './ai';

export type { ChatDigest };

export type ChatRole = 'user' | 'assistant';

/**
 * Página da biblioteca em que a resposta se apoiou. Quem monta a lista é o app (a partir dos trechos
 * que a busca achou), nunca o modelo, então o link não é inventado. Abrir `/library/<documentId>`
 * com `#<anchor>` leva à seção.
 */
export interface ChatReference {
  documentId: string;
  /** Título da página. */
  title: string;
  /** Títulos até o trecho usado, do maior ao menor (o 1º costuma repetir o título da página). */
  headingPath: string[];
  /** Âncora da seção; `null` se o trecho vem antes do primeiro título. */
  anchor: string | null;
  category: string[];
  /**
   * Posição da referência na lista (1, 2, 3…): é o número `[n]` que o texto da resposta usa para
   * apontar para esta página, e a tela o mostra no ícone. Ausente em conversas gravadas antes disso.
   */
  number?: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** Só nas respostas do assistente que usaram páginas da biblioteca. */
  references?: ChatReference[];
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
  /** Resumo do começo da conversa, enviado ao modelo no lugar das mensagens que cobre (a tela mostra todas). */
  digest?: ChatDigest;
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
  /**
   * Janela de contexto do modelo, em tokens, quando a tela a conhece. Define quantos trechos das
   * páginas da biblioteca acompanham a pergunta (janela curta recebe menos).
   */
  contextLimit?: number;
  /** Tamanho do modelo em bilhões de parâmetros, quando se sabe (modelo pequeno recebe menos trechos). */
  modelBillions?: number;
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

/** Payload do evento `chat:chunk`: texto novo (não o acumulado) da resposta em andamento do chat. */
export interface ChatChunkPayload {
  chatId: string;
  text: string;
}
