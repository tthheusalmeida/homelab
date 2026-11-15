import type { DocumentHints } from '@front/pages/jobs/create/hints';
import type { SummaryDetail } from '@front/pages/jobs/create/summary-detail';
import type { JobType } from '@front/pages/jobs/types/job.types';

import { IpcChannels } from '../../src/shared/channels';
import type { AiProviderId } from '../../src/shared/contracts/ai';
import { ipc } from '../ipc';

/**
 * Cópia de `front/src/pages/jobs/create/api/create.ts` com o corpo por IPC (fase 08). Mesmas
 * assinaturas e mesmos tipos exportados; o corpo do `POST` virou o payload do canal.
 */

export interface CreateVideoToTranscriptParams extends DocumentHints {
  url: string;
}

export interface CreateVideoToSummaryParams extends DocumentHints {
  url: string;
  providerId: string;
  modelId: string;
  thinking: string;
  detail: SummaryDetail;
}

export async function getJobTypes(): Promise<JobType[]> {
  return ipc.invoke(IpcChannels.jobs.types);
}

export async function createVideoToTranscript(
  params: CreateVideoToTranscriptParams,
): Promise<{ id: string; status: string }> {
  return ipc.invoke(IpcChannels.jobs.createVideoToTranscript, params);
}

export async function createVideoToSummary(
  params: CreateVideoToSummaryParams,
): Promise<{ id: string; status: string }> {
  return ipc.invoke(IpcChannels.jobs.createVideoToSummary, {
    ...params,
    providerId: params.providerId as AiProviderId,
  });
}
