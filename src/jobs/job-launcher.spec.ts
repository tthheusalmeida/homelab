import { IpcError, IpcErrorCode } from '../shared/errors';

import { JobLauncher } from './job-launcher';

const transcriptProcessor = { name: 'transcript' };
const summaryProcessor = { name: 'summary' };
const pdfProcessor = { name: 'pdf' };

function setup(
  parseHints: (raw: unknown) => unknown = (raw) => ({ parsed: raw }),
  original: { id: string; status: string; name?: string; request?: unknown } = {
    id: 'old',
    status: 'failed',
  },
) {
  const calls: string[] = [];
  const job = {
    id: 'job-1',
    status: 'pending',
    resetForRetry: jest.fn(),
    replaceRequest: jest.fn(),
  };
  const retried = { ...original, resetForRetry: jest.fn(), replaceRequest: jest.fn() };
  const jobs = {
    create: jest.fn((name: string, hints?: unknown, request?: unknown) => {
      calls.push(`create:${name}`);
      void hints;
      void request;

      return job;
    }),
    findById: jest.fn(() => retried),
    save: jest.fn(),
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
  const pdf = {
    prepare: jest.fn(async () => ({ checkpointKey: 'a'.repeat(24) })),
    assertProgressExists: jest.fn().mockResolvedValue(undefined),
  };
  const launcher = new JobLauncher({
    jobs,
    runner,
    transcriptProcessor,
    summaryProcessor,
    pdfProcessor,
    pdf,
    parseHints: parse,
  });

  return { launcher, jobs, runner, parse, job, calls, pdf, retried };
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

  it('when a failed transcript job is retried, should reset and queue the same job without creating another', () => {
    const { launcher, jobs, runner, retried } = setup(undefined, {
      id: 'old',
      status: 'failed',
      name: 'video-to-transcript',
      request,
    });

    expect(launcher.retry('old')).toEqual({ id: 'old', status: 'failed' });
    expect(retried.resetForRetry).toHaveBeenCalledTimes(1);
    expect(jobs.save).toHaveBeenCalledWith(retried);
    expect(jobs.create).not.toHaveBeenCalled();
    expect(runner.run).toHaveBeenCalledWith(retried, transcriptProcessor, request.url);
  });

  it('when a failed summary job is retried, should queue the same job with the summary processor', () => {
    const summary = { url: 'https://exemplo.com/v.mp4', providerId: 'gemini', modelId: 'm' };
    const { launcher, runner, retried } = setup(undefined, {
      id: 'old',
      status: 'failed',
      name: 'video-to-summary',
      request: summary,
    });

    void launcher.retry('old');

    expect(runner.run).toHaveBeenCalledWith(retried, summaryProcessor, summary);
  });

  it('when the job did not fail, should refuse and queue nothing', () => {
    const { launcher, runner, retried } = setup(undefined, {
      id: 'old',
      status: 'completed',
      name: 'video-to-summary',
      request,
    });

    expect(() => launcher.retry('old')).toThrow('Só dá para tentar de novo');
    expect(retried.resetForRetry).not.toHaveBeenCalled();
    expect(runner.run).not.toHaveBeenCalled();
  });

  it('when an old job kept no request, should refuse with a clear message', () => {
    const { launcher, runner } = setup(undefined, {
      id: 'old',
      status: 'failed',
      name: 'video-to-summary',
    });

    expect(() => launcher.retry('old')).toThrow('não guardou os dados');
    expect(runner.run).not.toHaveBeenCalled();
  });
});

describe('JobLauncher: resumo de PDF', () => {
  const key = 'a'.repeat(24);
  const request = {
    token: 'tok',
    providerId: 'gemini' as const,
    modelId: 'm',
    title: 'Livro',
  };
  const input = { checkpointKey: key };

  it('when starting, should validate the hints before saving anything to disk', async () => {
    const { launcher, pdf } = setup(() => {
      throw new Error('título inválido');
    });

    await expect(launcher.startPdfToSummary(request)).rejects.toThrow('título inválido');
    expect(pdf.prepare).not.toHaveBeenCalled();
  });

  it('when starting, should prepare the text on disk and then create the job with the key as request', async () => {
    const { launcher, jobs, pdf } = setup();

    await launcher.startPdfToSummary(request);

    expect(pdf.prepare).toHaveBeenCalledWith(request);
    expect(jobs.create).toHaveBeenCalledWith('pdf-to-summary', { parsed: input }, input);
  });

  it('when starting, should queue the job with the pdf processor and answer id and status', async () => {
    const { launcher, runner, job } = setup();

    await expect(launcher.startPdfToSummary(request)).resolves.toEqual({
      id: 'job-1',
      status: 'pending',
    });
    expect(runner.run).toHaveBeenCalledWith(job, pdfProcessor, input);
  });

  it('when the text cannot be prepared, should create no job', async () => {
    const { launcher, jobs, runner, pdf } = setup();

    pdf.prepare.mockRejectedValue(new Error('A leitura deste PDF não está mais disponível'));

    await expect(launcher.startPdfToSummary(request)).rejects.toThrow('não está mais disponível');
    expect(jobs.create).not.toHaveBeenCalled();
    expect(runner.run).not.toHaveBeenCalled();
  });

  it('when a failed pdf job is retried, should check the progress and queue the same job with the same key', async () => {
    const { launcher, jobs, runner, retried, pdf } = setup(undefined, {
      id: 'old',
      status: 'failed',
      name: 'pdf-to-summary',
      request: input,
    });

    await expect(launcher.retry('old')).resolves.toEqual({ id: 'old', status: 'failed' });

    expect(pdf.assertProgressExists).toHaveBeenCalledWith(key);
    expect(pdf.prepare).not.toHaveBeenCalled();
    expect(jobs.create).not.toHaveBeenCalled();
    expect(runner.run).toHaveBeenCalledWith(retried, pdfProcessor, input);
  });

  it('when the progress of a pdf job is gone, should refuse the retry and keep the job as it was', async () => {
    const { launcher, runner, retried, pdf } = setup(undefined, {
      id: 'old',
      status: 'failed',
      name: 'pdf-to-summary',
      request: input,
    });

    pdf.assertProgressExists.mockRejectedValue(new Error('não está mais guardado'));

    await expect(launcher.retry('old')).rejects.toThrow('não está mais guardado');
    expect(retried.resetForRetry).not.toHaveBeenCalled();
    expect(runner.run).not.toHaveBeenCalled();
  });
});

describe('JobLauncher: tentar de novo trocando o modelo', () => {
  const key = 'a'.repeat(24);
  const original = {
    id: 'old',
    status: 'failed',
    name: 'pdf-to-summary',
    request: {
      checkpointKey: key,
      providerId: 'gemini',
      modelId: 'm1',
      thinking: 'on',
      title: 'T',
    },
  };

  it('when a new model is given, should keep it in the same job and queue it with the same key', async () => {
    const { launcher, runner, retried } = setup(undefined, original);

    await launcher.retry('old', { providerId: 'ollama', modelId: 'qwen', thinking: 'off' });

    const expected = {
      ...original.request,
      providerId: 'ollama',
      modelId: 'qwen',
      thinking: 'off',
    };

    expect(retried.replaceRequest).toHaveBeenCalledWith(expected);
    expect(runner.run).toHaveBeenCalledWith(retried, pdfProcessor, expected);
  });

  it('when no model is given, should keep the original one', async () => {
    const { launcher, runner, retried } = setup(undefined, original);

    await launcher.retry('old', { modelId: undefined });

    expect(runner.run).toHaveBeenCalledWith(retried, pdfProcessor, original.request);
  });

  it('when only the model id is given, should change only that field', async () => {
    const { launcher, runner, retried } = setup(undefined, original);

    await launcher.retry('old', { modelId: 'm2' });

    expect(runner.run).toHaveBeenCalledWith(retried, pdfProcessor, {
      ...original.request,
      modelId: 'm2',
    });
  });

  it('when the job is a video summary, should resume it with the new model', () => {
    const request = { url: 'https://exemplo.com/v.mp4', providerId: 'gemini', modelId: 'm1' };
    const { launcher, runner, retried } = setup(undefined, {
      id: 'old',
      status: 'failed',
      name: 'video-to-summary',
      request,
    });

    void launcher.retry('old', { modelId: 'outro' });

    expect(retried.replaceRequest).toHaveBeenCalledWith({ ...request, modelId: 'outro' });
    expect(runner.run).toHaveBeenCalledWith(retried, summaryProcessor, {
      ...request,
      modelId: 'outro',
    });
  });

  it('when the job is a video transcript, should ignore the model overrides', () => {
    const request = { url: 'https://exemplo.com/v.mp4' };
    const { launcher, runner, retried } = setup(undefined, {
      id: 'old',
      status: 'failed',
      name: 'video-to-transcript',
      request,
    });

    void launcher.retry('old', { modelId: 'outro' });

    expect(retried.replaceRequest).not.toHaveBeenCalled();
    expect(runner.run).toHaveBeenCalledWith(retried, transcriptProcessor, request.url);
  });
});
