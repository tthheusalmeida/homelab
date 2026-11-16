import type { Job } from '../../types/job.types';

import { IpcChannels } from '#shared/channels';
import type {
  JobCancelResult,
  JobCreated,
  JobDeleteResult,
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

/** Cancela um job: na fila sai dela; rodando, para ao fim da etapa em andamento. */
export async function cancelJob(id: string): Promise<JobCancelResult> {
  return ipc.invoke(IpcChannels.jobs.cancel, { id });
}

/** Cria outro job com os mesmos dados de um que falhou. */
export async function retryJob(id: string): Promise<JobCreated> {
  return ipc.invoke(IpcChannels.jobs.retry, { id });
}

/** Desfaz a última exclusão do histórico. */
export async function undoDeleteJobs(): Promise<JobUndoDeleteResult> {
  return ipc.invoke(IpcChannels.jobs.undoDelete);
}
