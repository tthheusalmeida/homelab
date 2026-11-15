import { IpcError, IpcErrorCode } from '../shared/errors';

import { JobLauncher } from './job-launcher';

const transcriptProcessor = { name: 'transcript' };
const summaryProcessor = { name: 'summary' };

function setup(parseHints: (raw: unknown) => unknown = (raw) => ({ parsed: raw })) {
  const calls: string[] = [];
  const job = { id: 'job-1', status: 'pending' };
  const jobs = {
    create: jest.fn((name: string, hints?: unknown) => {
      calls.push(`create:${name}`);
      void hints;

      return job;
    }),
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

    expect(jobs.create).toHaveBeenCalledWith('video-to-transcript', {
      parsed: { ...request, title: 'Aula', tags: ['devops'] },
    });
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

    expect(jobs.create).toHaveBeenCalledWith('video-to-summary', {
      parsed: { ...request, category: ['Tecnologia', 'DevOps'] },
    });
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
