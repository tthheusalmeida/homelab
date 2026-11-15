import type { DocumentHints } from '../hints';
import type { SummaryDetail } from '../summary-detail';
import type { JobType } from '../../types/job.types';

import { IpcChannels } from '#shared/channels';
import type { AiProviderId } from '#shared/contracts/ai';
import { ipc } from '#lib/ipc';

/**
 * Corpo por IPC (fase 08). Mesmas
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
