import type { Job } from '../../types/job.types';

import { IpcChannels } from '#shared/channels';
import type {
  JobAccessResult,
  JobCancelResult,
  JobCreated,
  JobCleanResult,
  JobDeleteResult,
  JobLeftovers,
  JobRetryRequest,
  JobUndoDeleteResult,
} from '#shared/contracts/jobs';
import { ipc } from '#lib/ipc';

/** Corpo por IPC (o polling de 1 s continua no hook). */
export async function fetchJobs(): Promise<Job[]> {
  return ipc.invoke(IpcChannels.jobs.list) as unknown as Promise<Job[]>;
}

/** Exclui do histórico os jobs informados (os que estão na fila ou rodando ficam). */
export async function deleteJobs(ids: string[]): Promise<JobDeleteResult> {
  return ipc.invoke(IpcChannels.jobs.delete, { ids });
}

/** Exclui todo o histórico, menos o que está na fila ou rodando. */
export async function deleteAllJobs(): Promise<JobDeleteResult> {
  return ipc.invoke(IpcChannels.jobs.deleteAll);
}

/** Cancela um job: na fila sai dela; rodando, interrompe a etapa em andamento na hora. */
export async function cancelJob(id: string): Promise<JobCancelResult> {
  return ipc.invoke(IpcChannels.jobs.cancel, { id });
}

/**
 * Cria outro job com os mesmos dados de um que falhou. Num resumo de PDF dá para trocar o modelo: o
 * trabalho continua de onde parou e só as partes que faltam usam o modelo novo.
 */
export async function retryJob(
  id: string,
  model?: Pick<JobRetryRequest, 'providerId' | 'modelId' | 'thinking'>,
): Promise<JobCreated> {
  return ipc.invoke(IpcChannels.jobs.retry, { id, ...model });
}

/** Mede os arquivos que processos não terminados deixaram no disco. */
export async function scanLeftovers(): Promise<JobLeftovers> {
  return ipc.invoke(IpcChannels.jobs.leftovers);
}

/** Apaga esses arquivos (o que um processo em andamento usa nunca é apagado). */
export async function cleanLeftovers(): Promise<JobCleanResult> {
  return ipc.invoke(IpcChannels.jobs.cleanLeftovers);
}

/** Abre a janela de login do site do vídeo e guarda o acesso quando o usuário a fecha. */
export async function grantJobAccess(id: string): Promise<JobAccessResult> {
  return ipc.invoke(IpcChannels.jobs.grantAccess, { id });
}

/** Desfaz a última exclusão do histórico. */
export async function undoDeleteJobs(): Promise<JobUndoDeleteResult> {
  return ipc.invoke(IpcChannels.jobs.undoDelete);
}
