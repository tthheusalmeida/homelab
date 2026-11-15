import type { Job } from '../../types/job.types';

import { IpcChannels } from '#shared/channels';
import type { JobDeleteResult } from '#shared/contracts/jobs';
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
