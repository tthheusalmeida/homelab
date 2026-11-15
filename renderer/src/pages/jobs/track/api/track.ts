import type { Job } from '../../types/job.types';

import { IpcChannels } from '#shared/channels';
import { ipc } from '#lib/ipc';

/** Corpo por IPC (o polling de 1 s continua no hook). */
export async function fetchJobs(): Promise<Job[]> {
  return ipc.invoke(IpcChannels.jobs.list) as unknown as Promise<Job[]>;
}
