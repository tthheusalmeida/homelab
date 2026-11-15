import type { Job } from '@front/pages/jobs/types/job.types';

import { IpcChannels } from '../../src/shared/channels';
import { ipc } from '../ipc';

/** Cópia de `front/src/pages/jobs/track/api/track.ts` com o corpo por IPC (o polling de 1 s continua no hook). */
export async function fetchJobs(): Promise<Job[]> {
  return ipc.invoke(IpcChannels.jobs.list) as unknown as Promise<Job[]>;
}
