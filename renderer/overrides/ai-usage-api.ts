import type { AiUsageParams, AiUsageResponse } from '@front/pages/ai/usage/types/aiUsage.types';

import { IpcChannels } from '../../src/shared/channels';
import type { AiProviderId } from '../../src/shared/contracts/ai';
import { ipc } from '../ipc';

/** Cópia de `front/src/pages/ai/usage/api/getAiUsage.ts` com o corpo por IPC. */
export async function getAiUsage(params: AiUsageParams = {}): Promise<AiUsageResponse> {
  const provider = params.provider ? (params.provider as AiProviderId) : undefined;

  return ipc.invoke(IpcChannels.ai.usage, { provider }) as unknown as Promise<AiUsageResponse>;
}
