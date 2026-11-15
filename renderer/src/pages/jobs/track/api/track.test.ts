import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import { fetchJobs } from './track';

describe('jobs track api', () => {
  it('when fetching the jobs, should call jobs:list and answer them in order', async () => {
    const jobs = [
      { id: 'j1', status: 'completed', steps: [] },
      { id: 'j2', status: 'running', steps: [] },
    ];
    const invoke = mockApi({ [IpcChannels.jobs.list]: () => ok(jobs) });

    await expect(fetchJobs()).resolves.toEqual(jobs);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.list);
  });

  it('when polling twice, should call jobs:list each time (the 1 s polling stays in the hook)', async () => {
    const invoke = mockApi({ [IpcChannels.jobs.list]: () => ok([]) });

    await fetchJobs();
    await fetchJobs();

    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it('when the list fails, should reject with the message from the main', async () => {
    mockApi({ [IpcChannels.jobs.list]: () => failure('INTERNAL', 'sem fila') });

    await expect(fetchJobs()).rejects.toThrow('sem fila');
  });
});
