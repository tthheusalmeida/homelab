import { countResumablePdfJobs } from './pdf-resume';

describe('countResumablePdfJobs', () => {
  const requests: Record<string, unknown> = {
    pdf1: { checkpointKey: 'k1' },
    pdf2: { checkpointKey: 'k2' },
    video: { url: 'http://x' },
    old: undefined,
  };
  const requestOf = (id: string) => requests[id];

  it('when pdf jobs still have progress on disk, should count them', () => {
    expect(countResumablePdfJobs(['pdf1', 'pdf2'], requestOf, () => true)).toBe(2);
  });

  it('when the progress was deleted, should not count the job', () => {
    expect(countResumablePdfJobs(['pdf1', 'pdf2'], requestOf, (key) => key === 'k2')).toBe(1);
  });

  it('when the job is not a pdf job or has no stored request, should not count it', () => {
    expect(countResumablePdfJobs(['video', 'old'], requestOf, () => true)).toBe(0);
  });

  it('when the job cannot be found, should not fail', () => {
    const missing = () => {
      throw new Error('não encontrado');
    };

    expect(countResumablePdfJobs(['x'], missing, () => true)).toBe(0);
  });

  it('when there are no interrupted jobs, should answer zero', () => {
    expect(countResumablePdfJobs([], requestOf, () => true)).toBe(0);
  });
});
