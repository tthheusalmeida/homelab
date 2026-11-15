import type { AiModel, AiProvider, AiThinkingOption } from '@front/pages/ai/chat/types/chat';

import { IpcChannels } from '../../src/shared/channels';
import type { AiProviderId } from '../../src/shared/contracts/ai';
import { ipc } from '../ipc';

/** Cópia de `front/src/pages/ai/chat/api/chat.ts` com o corpo por IPC (mesmas assinaturas). */
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
