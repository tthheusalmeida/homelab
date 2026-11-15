import type { AiModel, AiProvider, AiThinkingOption } from '../types/chat';

import { IpcChannels } from '#shared/channels';
import type { AiProviderId } from '#shared/contracts/ai';
import type {
  ChatDetail,
  ChatSendRequest,
  ChatSendResponse,
  ChatSummary,
} from '#shared/contracts/chat';
import { ipc } from '#lib/ipc';

/** Corpo por IPC (mesmas assinaturas). */
export function getAiProviders(): Promise<AiProvider[]> {
  return ipc.invoke(IpcChannels.ai.providers);
}

export function getAiModels(providerId: string): Promise<AiModel[]> {
  return ipc.invoke(IpcChannels.ai.models, {
    providerId: providerId as AiProviderId,
  }) as unknown as Promise<AiModel[]>;
}

export function getAiThinkingOptions(
  providerId: string,
  modelId: string,
): Promise<AiThinkingOption[]> {
  return ipc.invoke(IpcChannels.ai.thinking, {
    providerId: providerId as AiProviderId,
    modelId,
  });
}

/** Conversas salvas, da mais recente para a mais antiga. */
export function listChats(): Promise<ChatSummary[]> {
  return ipc.invoke(IpcChannels.chats.list);
}

export function getChat(id: string): Promise<ChatDetail> {
  return ipc.invoke(IpcChannels.chats.get, { id });
}

export function deleteChat(id: string): Promise<void> {
  return ipc.invoke(IpcChannels.chats.delete, { id });
}

/** Envia a mensagem; o main reenvia o histórico inteiro do chat ao provedor e grava a resposta. */
export function sendChatMessage(request: ChatSendRequest): Promise<ChatSendResponse> {
  return ipc.invoke(IpcChannels.chat.send, request);
}

/** Pede ao main que descarte a resposta que ainda está sendo gerada (a chamada ao provedor não para). */
export function cancelChatMessage(chatId: string): Promise<void> {
  return ipc.invoke(IpcChannels.chat.cancel, { chatId });
}
