import type { AiUsageParams, AiUsageResponse } from '../types/aiUsage.types';

import { IpcChannels } from '#shared/channels';
import type { AiProviderId } from '#shared/contracts/ai';
import { ipc } from '#lib/ipc';

/** Corpo por IPC. */
export async function getAiUsage(params: AiUsageParams = {}): Promise<AiUsageResponse> {
  const provider = params.provider ? (params.provider as AiProviderId) : undefined;

  return ipc.invoke(IpcChannels.ai.usage, { provider }) as unknown as Promise<AiUsageResponse>;
}
