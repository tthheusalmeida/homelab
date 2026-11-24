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
  thinking?: string;
  detail: SummaryDetail;
}

/** Pedido em lote: vários links com as mesmas opções (um job por link). */
export type BatchParams<T extends { url: string }> = Omit<T, 'url'> & { urls: string[] };

/** O que o lote fez: quantos jobs entraram na fila e quais links não puderam ser criados. */
export interface BatchResult {
  created: number;
  failed: string[];
}

/**
 * Cria um job por link, em ordem (a fila do back também roda um por vez). Um link que falha não
 * impede os outros: ele volta em `failed` para a tela oferecer tentar de novo. Se **todos**
 * falharem, o último erro sobe, como numa criação simples.
 */
async function createEach(
  urls: string[],
  create: (url: string) => Promise<unknown>,
): Promise<BatchResult> {
  const failed: string[] = [];
  let lastError: unknown;

  for (const url of urls) {
    try {
      await create(url);
    } catch (error) {
      failed.push(url);
      lastError = error;
    }
  }

  if (urls.length > 0 && failed.length === urls.length) {
    throw lastError;
  }

  return { created: urls.length - failed.length, failed };
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

export async function createVideoToTranscriptBatch({
  urls,
  ...options
}: BatchParams<CreateVideoToTranscriptParams>): Promise<BatchResult> {
  return createEach(urls, (url) => createVideoToTranscript({ ...options, url }));
}

export async function createVideoToSummaryBatch({
  urls,
  ...options
}: BatchParams<CreateVideoToSummaryParams>): Promise<BatchResult> {
  return createEach(urls, (url) => createVideoToSummary({ ...options, url }));
}
