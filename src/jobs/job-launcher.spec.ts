import { IpcError, IpcErrorCode } from '../shared/errors';

import { JobLauncher } from './job-launcher';

const transcriptProcessor = { name: 'transcript' };
const summaryProcessor = { name: 'summary' };

function setup(
  parseHints: (raw: unknown) => unknown = (raw) => ({ parsed: raw }),
  original: { id: string; status: string; name?: string; request?: unknown } = {
    id: 'old',
    status: 'failed',
  },
) {
  const calls: string[] = [];
  const job = { id: 'job-1', status: 'pending' };
  const jobs = {
    create: jest.fn((name: string, hints?: unknown, request?: unknown) => {
      calls.push(`create:${name}`);
      void hints;
      void request;

      return job;
    }),
    findById: jest.fn(() => original),
  };
  const runner = {
    run: jest.fn(() => {
      calls.push('run');
    }),
  };
  const parse = jest.fn((raw: unknown) => {
    calls.push('parse');

    return parseHints(raw);
  });
  const launcher = new JobLauncher({
    jobs,
    runner,
    transcriptProcessor,
    summaryProcessor,
    parseHints: parse,
  });

  return { launcher, jobs, runner, parse, job, calls };
}

describe('JobLauncher: transcrição', () => {
  const request = { url: 'https://exemplo.com/v.mp4' };

  it('when starting, should create a video-to-transcript job with the parsed hints', () => {
    const { launcher, jobs } = setup();

    launcher.startVideoToTranscript({ ...request, title: 'Aula', tags: ['devops'] });

    expect(jobs.create).toHaveBeenCalledWith(
      'video-to-transcript',
      { parsed: { ...request, title: 'Aula', tags: ['devops'] } },
      { ...request, title: 'Aula', tags: ['devops'] },
    );
  });

  it('when starting, should queue the job with the transcript processor and only the url as input', () => {
    const { launcher, runner, job } = setup();

    launcher.startVideoToTranscript(request);

    expect(runner.run).toHaveBeenCalledWith(job, transcriptProcessor, request.url);
  });

  it('when starting, should answer id and status right away', () => {
    const { launcher } = setup();

    expect(launcher.startVideoToTranscript(request)).toEqual({ id: 'job-1', status: 'pending' });
  });

  it('when starting, should validate the hints before creating and queueing, in that order', () => {
    const { launcher, calls } = setup();

    launcher.startVideoToTranscript(request);

    expect(calls).toEqual(['parse', 'create:video-to-transcript', 'run']);
  });

  it('when the hints are invalid, should reject without creating or queueing any job', () => {
    const invalid = new IpcError(
      IpcErrorCode.VALIDATION,
      'O campo "tags" deve ser uma lista de textos.',
    );
    const { launcher, jobs, runner } = setup(() => {
      throw invalid;
    });

    expect(() => launcher.startVideoToTranscript({ ...request, tags: 'x' as never })).toThrow(
      invalid,
    );
    expect(jobs.create).not.toHaveBeenCalled();
    expect(runner.run).not.toHaveBeenCalled();
  });
});

describe('JobLauncher: resumo', () => {
  const request = {
    url: 'https://exemplo.com/v.mp4',
    providerId: 'gemini' as const,
    modelId: 'gemini-x',
    thinking: 'off',
    detail: 'study' as const,
  };

  it('when starting, should create a video-to-summary job with the parsed hints', () => {
    const { launcher, jobs } = setup();

    launcher.startVideoToSummary({ ...request, category: ['Tecnologia', 'DevOps'] });

    expect(jobs.create).toHaveBeenCalledWith(
      'video-to-summary',
      { parsed: { ...request, category: ['Tecnologia', 'DevOps'] } },
      { ...request, category: ['Tecnologia', 'DevOps'] },
    );
  });

  it('when starting, should queue the job with the summary processor and the whole request as input', () => {
    const { launcher, runner, job } = setup();

    launcher.startVideoToSummary(request);

    expect(runner.run).toHaveBeenCalledWith(job, summaryProcessor, request);
  });

  it('when starting, should answer id and status right away', () => {
    const { launcher } = setup();

    expect(launcher.startVideoToSummary(request)).toEqual({ id: 'job-1', status: 'pending' });
  });

  it('when the hints are invalid, should reject without creating or queueing any job', () => {
    const { launcher, jobs, runner } = setup(() => {
      throw new IpcError(IpcErrorCode.VALIDATION, 'O título excede 120 caracteres.');
    });

    expect(() => launcher.startVideoToSummary({ ...request, title: 'x'.repeat(200) })).toThrow(
      'O título excede 120 caracteres.',
    );
    expect(jobs.create).not.toHaveBeenCalled();
    expect(runner.run).not.toHaveBeenCalled();
  });

  it('when two jobs are started, should create and queue each one separately', () => {
    const { launcher, jobs, runner } = setup();

    launcher.startVideoToSummary(request);
    launcher.startVideoToTranscript({ url: 'https://exemplo.com/outro.mp4' });

    expect(jobs.create).toHaveBeenCalledTimes(2);
    expect(runner.run).toHaveBeenCalledTimes(2);
  });
});

describe('JobLauncher: tentar de novo', () => {
  const request = { url: 'https://exemplo.com/v.mp4' };

  it('when a failed transcript job is retried, should create a new one with the same request', () => {
    const { launcher, jobs, runner, job } = setup(undefined, {
      id: 'old',
      status: 'failed',
      name: 'video-to-transcript',
      request,
    });

    expect(launcher.retry('old')).toEqual({ id: 'job-1', status: 'pending' });
    expect(jobs.create).toHaveBeenCalledWith('video-to-transcript', { parsed: request }, request);
    expect(runner.run).toHaveBeenCalledWith(job, transcriptProcessor, request.url);
  });

  it('when a failed summary job is retried, should queue it with the summary processor', () => {
    const summary = { url: 'https://exemplo.com/v.mp4', providerId: 'gemini', modelId: 'm' };
    const { launcher, runner, job } = setup(undefined, {
      id: 'old',
      status: 'failed',
      name: 'video-to-summary',
      request: summary,
    });

    launcher.retry('old');

    expect(runner.run).toHaveBeenCalledWith(job, summaryProcessor, summary);
  });

  it('when the job did not fail, should refuse and create nothing', () => {
    const { launcher, jobs } = setup(undefined, {
      id: 'old',
      status: 'completed',
      name: 'video-to-summary',
      request,
    });

    expect(() => launcher.retry('old')).toThrow('Só dá para tentar de novo');
    expect(jobs.create).not.toHaveBeenCalled();
  });

  it('when an old job kept no request, should refuse with a clear message', () => {
    const { launcher, jobs } = setup(undefined, {
      id: 'old',
      status: 'failed',
      name: 'video-to-summary',
    });

    expect(() => launcher.retry('old')).toThrow('não guardou os dados');
    expect(jobs.create).not.toHaveBeenCalled();
  });
});
