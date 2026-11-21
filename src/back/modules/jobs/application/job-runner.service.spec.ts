import { JobRunner } from './job-runner.service';
import { CANCELLED_JOB_ERROR, Job } from '../domain/job.entity';
import { JobStatus } from '../domain/job-status.enum';
import { InMemoryJobRepository } from '../infrastructure/repositories/in-memory-job.repository';
import { JobProcessor } from '../domain/job-processor.interface';
import { AccessRequiredError } from '../../video/access-required.error';
import type { LibraryService } from '../../library/application/library.service';

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('JobRunner', () => {
  let repository: InMemoryJobRepository;
  let runner: JobRunner;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
    runner = new JobRunner(repository);
  });

  it('when the processor succeeds, should mark the job COMPLETED', async () => {
    const job = new Job('video-to-transcript');
    const processor: JobProcessor<string> = {
      process: jest.fn().mockResolvedValue(undefined),
    };

    runner.run(job, processor, 'input');
    await flush();

    expect(processor.process).toHaveBeenCalledWith(job, 'input');
    expect(job.status).toBe(JobStatus.COMPLETED);
    expect(repository.findById(job.id)).toBe(job);
  });

  it('when the processor is executing, should have the job RUNNING', async () => {
    const job = new Job('video-to-transcript');
    let statusDuring: JobStatus | undefined;
    const processor: JobProcessor<string> = {
      process: jest.fn().mockImplementation(() => {
        statusDuring = job.status;
        return Promise.resolve();
      }),
    };

    runner.run(job, processor, 'x');
    await flush();

    expect(statusDuring).toBe(JobStatus.RUNNING);
  });

  it('when the processor throws an Error, should mark the job FAILED with its message', async () => {
    const job = new Job('video-to-transcript');
    const processor: JobProcessor<string> = {
      process: jest.fn().mockRejectedValue(new Error('deu ruim')),
    };

    runner.run(job, processor, 'x');
    await flush();

    expect(job.status).toBe(JobStatus.FAILED);
    expect(job.error).toBe('deu ruim');
  });

  it('when the thrown value is not an Error, should use the generic message', async () => {
    const job = new Job('video-to-transcript');
    const processor: JobProcessor<string> = {
      process: jest.fn().mockRejectedValue('texto'),
    };

    runner.run(job, processor, 'x');
    await flush();

    expect(job.status).toBe(JobStatus.FAILED);
    expect(job.error).toBe('Erro desconhecido');
  });

  it('when the processor throws AccessRequiredError, should fail the job keeping the link to ask for access', async () => {
    const job = new Job('video-to-transcript');
    const processor: JobProcessor<string> = {
      process: jest.fn().mockRejectedValue(new AccessRequiredError('https://curso.edu/aula/1')),
    };

    runner.run(job, processor, 'x');
    await flush();

    expect(job.status).toBe(JobStatus.FAILED);
    expect(job.errorInfo).toEqual({ code: 'ACCESS_REQUIRED', url: 'https://curso.edu/aula/1' });
    expect(job.toJSON()).toMatchObject({
      errorCode: 'ACCESS_REQUIRED',
      accessUrl: 'https://curso.edu/aula/1',
    });
  });

  it('when the processor throws a common error, should not set an access request', async () => {
    const job = new Job('video-to-transcript');

    runner.run(job, { process: () => Promise.reject(new Error('x')) }, '');
    await flush();

    expect(job.errorInfo).toBeUndefined();
    expect(job.toJSON().errorCode).toBeUndefined();
  });

  it('when several jobs are queued, should process them in series in arrival order', async () => {
    const order: string[] = [];
    const make = (label: string): JobProcessor<string> => ({
      process: async () => {
        order.push(`start-${label}`);
        await flush();
        order.push(`end-${label}`);
      },
    });

    runner.run(new Job('video-to-transcript'), make('a'), '');
    runner.run(new Job('video-to-transcript'), make('b'), '');
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(order).toEqual(['start-a', 'end-a', 'start-b', 'end-b']);
  });

  it('when a job fails, should still run the next job in the queue', async () => {
    const failing = new Job('video-to-transcript');
    const next = new Job('video-to-transcript');

    runner.run(failing, { process: () => Promise.reject(new Error('x')) }, '');
    runner.run(next, { process: () => Promise.resolve() }, '');
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(failing.status).toBe(JobStatus.FAILED);
    expect(next.status).toBe(JobStatus.COMPLETED);
  });

  describe('avisos ao usuário', () => {
    const withAlerts = () => {
      const alerts = { persistFailed: jest.fn(), jobFinished: jest.fn() };

      return { alerts, runner: new JobRunner(repository, alerts) };
    };

    it('when the job completes, should tell the alerts it finished with success', async () => {
      const { alerts, runner: alerted } = withAlerts();
      const job = new Job('video-to-transcript');

      alerted.run(job, { process: jest.fn().mockResolvedValue(undefined) }, 'x');
      await flush();

      expect(alerts.jobFinished).toHaveBeenCalledWith({
        id: job.id,
        label: job.label,
        status: 'completed',
        error: undefined,
      });
    });

    it('when the job fails, should tell the alerts it failed with the error message', async () => {
      const { alerts, runner: alerted } = withAlerts();
      const job = new Job('video-to-summary');

      alerted.run(
        job,
        { process: jest.fn().mockRejectedValue(new Error('ffmpeg não achado')) },
        'x',
      );
      await flush();

      expect(alerts.jobFinished).toHaveBeenCalledWith({
        id: job.id,
        label: job.label,
        status: 'failed',
        error: 'ffmpeg não achado',
      });
    });

    it('when the job is only starting, should not tell the alerts yet', async () => {
      const { alerts, runner: alerted } = withAlerts();
      const job = new Job('video-to-transcript');

      alerted.run(job, { process: jest.fn(() => new Promise(() => undefined)) }, 'x');
      await flush();

      expect(alerts.jobFinished).not.toHaveBeenCalled();
    });

    it('when the alerts themselves throw, should not break the queue and the next job should still run', async () => {
      const alerts = {
        persistFailed: jest.fn(),
        jobFinished: jest.fn(() => {
          throw new Error('sem janela');
        }),
      };
      const alerted = new JobRunner(repository, alerts);
      const first = new Job('video-to-transcript');
      const second = new Job('video-to-transcript');

      alerted.run(first, { process: jest.fn().mockResolvedValue(undefined) }, 'x');
      alerted.run(second, { process: jest.fn().mockResolvedValue(undefined) }, 'x');
      await flush();
      await flush();

      expect(first.status).toBe(JobStatus.COMPLETED);
      expect(second.status).toBe(JobStatus.COMPLETED);
    });

    it('when there are no alerts at all, should run normally', async () => {
      const job = new Job('video-to-transcript');

      runner.run(job, { process: jest.fn().mockResolvedValue(undefined) }, 'x');
      await flush();

      expect(job.status).toBe(JobStatus.COMPLETED);
    });
  });

  describe('cancelar', () => {
    it('when a queued job is cancelled, should leave the queue and fail as cancelled', async () => {
      const first = new Job('video-to-transcript');
      const queued = new Job('video-to-transcript');
      let release: () => void = () => undefined;
      const slow: JobProcessor<string> = {
        process: jest.fn(() => new Promise<void>((resolve) => (release = resolve))),
      };
      const never: JobProcessor<string> = { process: jest.fn() };

      runner.run(first, slow, 'a');
      runner.run(queued, never, 'b');
      await flush();

      expect(runner.cancel(queued.id)).toEqual({ id: queued.id, outcome: 'cancelled' });
      expect(queued.status).toBe(JobStatus.FAILED);
      expect(queued.error).toBe(CANCELLED_JOB_ERROR);

      release();
      await flush();

      expect(never.process).not.toHaveBeenCalled();
    });

    it('when the running job is cancelled, should stop before the next step and not alert a failure', async () => {
      const alerts = { persistFailed: jest.fn(), jobFinished: jest.fn() };
      const withAlerts = new JobRunner(repository, alerts);
      const job = new Job('video-to-summary');
      const processor: JobProcessor<string> = {
        process: async (current) => {
          await current.runStep(current.steps[0].name, async () => {
            withAlerts.cancel(current.id);
          });
          await current.runStep(current.steps[1].name, async () => undefined);
        },
      };

      withAlerts.run(job, processor, 'x');
      await flush();

      expect(job.status).toBe(JobStatus.FAILED);
      expect(job.error).toBe(CANCELLED_JOB_ERROR);
      expect(job.steps[1].status).toBe(JobStatus.PENDING);
      expect(alerts.jobFinished).not.toHaveBeenCalled();
    });

    it('when the running job is cancelled, should answer cancelling', async () => {
      const job = new Job('video-to-transcript');
      let release: () => void = () => undefined;
      const slow: JobProcessor<string> = {
        process: jest.fn(() => new Promise<void>((resolve) => (release = resolve))),
      };

      runner.run(job, slow, 'a');
      await flush();

      expect(runner.cancel(job.id)).toEqual({ id: job.id, outcome: 'cancelling' });
      expect(job.cancelRequested).toBe(true);

      release();
      await flush();
    });

    it('when the job already finished or does not exist, should answer not-active', async () => {
      const job = new Job('video-to-transcript');

      runner.run(job, { process: jest.fn().mockResolvedValue(undefined) }, 'a');
      await flush();

      expect(runner.cancel(job.id)).toEqual({ id: job.id, outcome: 'not-active' });
      expect(runner.cancel('nope')).toEqual({ id: 'nope', outcome: 'not-active' });
    });
  });

  describe('library refresh', () => {
    const succeed = (): JobProcessor<string> => ({
      process: jest.fn().mockResolvedValue(undefined),
    });

    it('when a job succeeds, should reindex the library before marking it COMPLETED', async () => {
      let statusAtReindex: JobStatus | undefined;
      const job = new Job('video-to-transcript');
      const library = {
        reindex: jest.fn().mockImplementation(() => {
          statusAtReindex = job.status;
          return Promise.resolve({ indexed: 1, errors: [] });
        }),
      };
      const withLibrary = new JobRunner(
        repository,
        undefined,
        library as unknown as LibraryService,
      );

      withLibrary.run(job, succeed(), 'x');
      await flush();

      expect(library.reindex).toHaveBeenCalledTimes(1);
      expect(statusAtReindex).toBe(JobStatus.RUNNING);
      expect(job.status).toBe(JobStatus.COMPLETED);
    });

    it('when a job of any kind succeeds, should reindex once per job', async () => {
      const library = { reindex: jest.fn().mockResolvedValue({ indexed: 1, errors: [] }) };
      const withLibrary = new JobRunner(
        repository,
        undefined,
        library as unknown as LibraryService,
      );

      withLibrary.run(new Job('pdf-to-summary'), succeed(), 'a');
      withLibrary.run(new Job('video-to-summary'), succeed(), 'b');
      await flush();
      await flush();

      expect(library.reindex).toHaveBeenCalledTimes(2);
    });

    it('when a job fails, should not reindex', async () => {
      const library = { reindex: jest.fn() };
      const withLibrary = new JobRunner(
        repository,
        undefined,
        library as unknown as LibraryService,
      );
      const processor: JobProcessor<string> = {
        process: jest.fn().mockRejectedValue(new Error('deu ruim')),
      };

      withLibrary.run(new Job('video-to-transcript'), processor, 'x');
      await flush();

      expect(library.reindex).not.toHaveBeenCalled();
    });

    it('when reindexing fails, should still complete the job', async () => {
      const library = { reindex: jest.fn().mockRejectedValue(new Error('index off')) };
      const withLibrary = new JobRunner(
        repository,
        undefined,
        library as unknown as LibraryService,
      );
      const job = new Job('video-to-transcript');

      withLibrary.run(job, succeed(), 'x');
      await flush();

      expect(job.status).toBe(JobStatus.COMPLETED);
    });
  });
});
