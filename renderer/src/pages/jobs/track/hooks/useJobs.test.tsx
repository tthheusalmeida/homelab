import { describe, expect, it } from 'vitest';

import { ACTIVE_JOBS_POLL_MS, IDLE_JOBS_POLL_MS, jobsRefetchInterval } from './useJobs';

const job = (status: string) =>
  ({
    id: status,
    name: 'n',
    label: 'L',
    status,
    createdAt: '2026-01-01T10:00:00.000Z',
    completedAt: '',
    steps: [],
  }) as never;

describe('jobsRefetchInterval', () => {
  it('when nothing was loaded yet, should poll fast to get the first answer', () => {
    expect(jobsRefetchInterval(undefined)).toBe(ACTIVE_JOBS_POLL_MS);
  });

  it('when a job is running, should keep polling every second to follow its progress', () => {
    expect(jobsRefetchInterval([job('completed'), job('running')])).toBe(ACTIVE_JOBS_POLL_MS);
  });

  it('when a job is waiting in the queue, should keep polling every second', () => {
    expect(jobsRefetchInterval([job('pending')])).toBe(ACTIVE_JOBS_POLL_MS);
  });

  it('when every job is finished, should relax the polling', () => {
    expect(jobsRefetchInterval([job('completed'), job('failed')])).toBe(IDLE_JOBS_POLL_MS);
  });

  it('when there are no jobs at all, should relax the polling', () => {
    expect(jobsRefetchInterval([])).toBe(IDLE_JOBS_POLL_MS);
  });
});
