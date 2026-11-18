import { INTERRUPTED_JOB_ERROR, Job, CANCELLED_JOB_ERROR, JobCancelledError } from './job.entity';
import { JobStatus } from './job-status.enum';
import { JobTypeConfig } from '../jobs.types';

describe('Job', () => {
  const newJob = () => new Job('video-to-transcript');

  describe('criação', () => {
    it('when a job is created, should start as PENDING with id and createdAt', () => {
      const job = newJob();

      expect(job.status).toBe(JobStatus.PENDING);
      expect(job.id).toEqual(expect.any(String));
      expect(job.createdAt).toBeInstanceOf(Date);
      expect(job.startedAt).toBeUndefined();
      expect(job.completedAt).toBeUndefined();
      expect(job.error).toBeUndefined();
    });

    it('when a job is created without hints, should have empty document hints', () => {
      expect(newJob().documentHints).toEqual({});
    });

    it('when a job is created with hints, should expose them but not serialize them', () => {
      const job = new Job('video-to-transcript', { title: 'T' });

      expect(job.documentHints).toEqual({ title: 'T' });
      expect(job.toJSON()).not.toHaveProperty('documentHints');
    });

    it('when a job is created, should copy label and steps from its type, all PENDING', () => {
      const job = newJob();
      const config = JobTypeConfig['video-to-transcript'];

      expect(job.name).toBe('video-to-transcript');
      expect(job.label).toBe(config.label);
      expect(job.steps.map((s) => s.name)).toEqual(config.steps.map((s) => s.name));
      expect(job.steps.every((s) => s.status === JobStatus.PENDING)).toBe(true);
    });

    it('when the job type is unknown, should throw', () => {
      expect(() => new Job('inexistente')).toThrow('inexistente');
    });

    it('when two jobs are created, should generate distinct ids', () => {
      expect(newJob().id).not.toBe(newJob().id);
    });
  });

  describe('ciclo de vida', () => {
    it('when start is called on a PENDING job, should become RUNNING with startedAt', () => {
      const job = newJob();

      job.start();

      expect(job.status).toBe(JobStatus.RUNNING);
      expect(job.startedAt).toBeInstanceOf(Date);
    });

    it('when start is called on a non-PENDING job, should throw', () => {
      const job = newJob();
      job.start();

      expect(() => job.start()).toThrow();
    });

    it('when complete is called on a RUNNING job, should become COMPLETED with completedAt', () => {
      const job = newJob();
      job.start();

      job.complete();

      expect(job.status).toBe(JobStatus.COMPLETED);
      expect(job.completedAt).toBeInstanceOf(Date);
    });

    it('when complete is called on a non-RUNNING job, should throw', () => {
      expect(() => newJob().complete()).toThrow();
    });

    it('when fail is called, should become FAILED and store the message', () => {
      const job = newJob();

      job.fail('boom');

      expect(job.status).toBe(JobStatus.FAILED);
      expect(job.error).toBe('boom');
    });
  });

  describe('etapas', () => {
    const stepName = 'download-video';
    const statusOf = (job: Job) => job.steps.find((s) => s.name === stepName)!.status;

    it('when step transitions are called, should update the step status', () => {
      const job = newJob();

      job.startStep(stepName);
      expect(statusOf(job)).toBe(JobStatus.RUNNING);

      job.completeStep(stepName);
      expect(statusOf(job)).toBe(JobStatus.COMPLETED);

      job.failStep(stepName);
      expect(statusOf(job)).toBe(JobStatus.FAILED);
    });

    it('when the step does not exist, should throw', () => {
      expect(() => newJob().startStep('nao-existe')).toThrow('nao-existe');
    });

    it('when runStep callback succeeds, should complete the step and return the result', async () => {
      const job = newJob();

      const result = await job.runStep(stepName, () => Promise.resolve(42));

      expect(result).toBe(42);
      expect(statusOf(job)).toBe(JobStatus.COMPLETED);
    });

    it('when runStep callback fails, should mark the step FAILED and rethrow the original error', async () => {
      const job = newJob();
      const error = new Error('falhou');

      await expect(job.runStep(stepName, () => Promise.reject(error))).rejects.toBe(error);
      expect(statusOf(job)).toBe(JobStatus.FAILED);
    });
  });

  it('when serialized, should expose the public fields', () => {
    const job = newJob();

    expect(Object.keys(job.toJSON()).sort()).toEqual(
      [
        'accessUrl',
        'cancelRequested',
        'completedAt',
        'createdAt',
        'error',
        'errorCode',
        'id',
        'label',
        'name',
        'note',
        'retryable',
        'startedAt',
        'status',
        'steps',
      ].sort(),
    );
  });

  describe('note', () => {
    it('when a note is set, should expose it in the JSON but not save it to disk', () => {
      const job = newJob();

      job.setNote('Tentando de novo');

      expect(job.note).toBe('Tentando de novo');
      expect(job.toJSON().note).toBe('Tentando de novo');
      expect(job.snapshot()).not.toHaveProperty('note');
    });

    it.each(['startStep', 'completeStep', 'failStep'] as const)(
      'when the step changes with %s, should clear the note',
      (method) => {
        const job = newJob();
        const step = job.steps[0].name;

        job.setNote('aviso');
        job[method](step);

        expect(job.note).toBeUndefined();
      },
    );

    it('when a step fails inside runStep, should clear the note', async () => {
      const job = newJob();

      job.setNote('aviso');
      await expect(
        job.runStep(job.steps[0].name, () => Promise.reject(new Error('x'))),
      ).rejects.toThrow('x');

      expect(job.note).toBeUndefined();
    });

    it('when the note is set with nothing, should clear it', () => {
      const job = newJob();

      job.setNote('aviso');
      job.setNote(undefined);

      expect(job.note).toBeUndefined();
    });
  });

  describe('persistence', () => {
    it('when taking a snapshot, should carry every field including the document hints and ISO dates', () => {
      const job = new Job('video-to-summary', { title: 'T', category: ['A', 'B'], tags: ['x'] });

      job.start();
      job.startStep(job.steps[0].name);

      const snapshot = job.snapshot();

      expect(snapshot).toEqual({
        id: job.id,
        name: 'video-to-summary',
        label: job.label,
        status: JobStatus.RUNNING,
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: undefined,
        error: undefined,
        steps: job.steps,
        documentHints: { title: 'T', category: ['A', 'B'], tags: ['x'] },
      });
    });

    it('when the snapshot goes through JSON and is restored, should be equal to the original job', () => {
      const job = new Job('video-to-summary', { tags: ['x'] });

      job.start();
      job.complete();

      const restored = Job.restore(JSON.parse(JSON.stringify(job.snapshot())));

      expect(restored).toBeInstanceOf(Job);
      expect(restored.id).toBe(job.id);
      expect(restored.createdAt).toEqual(job.createdAt);
      expect(restored.startedAt).toEqual(job.startedAt);
      expect(restored.completedAt).toEqual(job.completedAt);
      expect(restored.status).toBe(JobStatus.COMPLETED);
      expect(restored.documentHints).toEqual({ tags: ['x'] });
      expect(JSON.parse(JSON.stringify(restored))).toEqual(JSON.parse(JSON.stringify(job)));
    });

    it('when a failed job asked for access and is restored, should keep the access request', () => {
      const job = new Job('video-to-transcript');

      job.start();
      job.fail('Este vídeo precisa de login.', { code: 'ACCESS_REQUIRED', url: 'https://a.edu/1' });

      const restored = Job.restore(JSON.parse(JSON.stringify(job.snapshot())));

      expect(restored.errorInfo).toEqual({ code: 'ACCESS_REQUIRED', url: 'https://a.edu/1' });
      expect(restored.toJSON()).toMatchObject({
        errorCode: 'ACCESS_REQUIRED',
        accessUrl: 'https://a.edu/1',
      });
    });

    it('when a job fails again without access info, should drop the previous access request', () => {
      const job = new Job('video-to-transcript');

      job.fail('x', { code: 'ACCESS_REQUIRED', url: 'https://a.edu/1' });
      job.fail('outro erro');

      expect(job.errorInfo).toBeUndefined();
    });

    it('when restoring a job whose type no longer exists, should still restore it instead of throwing', () => {
      const snapshot = { ...new Job('video-to-summary').snapshot(), name: 'tipo-antigo' };

      expect(Job.restore(snapshot).name).toBe('tipo-antigo');
    });

    it('when restoring, should not share the steps array with the snapshot', () => {
      const snapshot = new Job('video-to-summary').snapshot();
      const restored = Job.restore(snapshot);

      restored.startStep(restored.steps[0].name);

      expect(snapshot.steps[0].status).toBe(JobStatus.PENDING);
    });

    it('when a restored job is still alive, should keep working (start, run steps, complete)', async () => {
      const restored = Job.restore(new Job('video-to-summary').snapshot());

      restored.start();
      await restored.runStep(restored.steps[0].name, () => Promise.resolve());
      restored.complete();

      expect(restored.status).toBe(JobStatus.COMPLETED);
    });
  });

  describe('interrupt', () => {
    it('when a running job is interrupted, should fail it with the default reason and fail the running step only', () => {
      const job = new Job('video-to-summary');

      job.start();
      job.completeStep(job.steps[0].name);
      job.startStep(job.steps[1].name);
      job.interrupt();

      expect(job.status).toBe(JobStatus.FAILED);
      expect(job.error).toBe(INTERRUPTED_JOB_ERROR);
      expect(job.steps.map((step) => step.status)).toEqual([
        JobStatus.COMPLETED,
        JobStatus.FAILED,
        ...job.steps.slice(2).map(() => JobStatus.PENDING),
      ]);
    });

    it('when a pending job is interrupted, should fail it and keep its steps pending', () => {
      const job = new Job('video-to-summary');

      job.interrupt('Motivo próprio');

      expect(job.status).toBe(JobStatus.FAILED);
      expect(job.error).toBe('Motivo próprio');
      expect(job.steps.every((step) => step.status === JobStatus.PENDING)).toBe(true);
    });
  });

  describe('cancelar e tentar de novo', () => {
    it('when cancel is requested, should not start the next step', async () => {
      const job = new Job('video-to-summary');
      const callback = jest.fn().mockResolvedValue('x');

      job.requestCancel();

      await expect(job.runStep(job.steps[0].name, callback)).rejects.toThrow(CANCELLED_JOB_ERROR);
      expect(callback).not.toHaveBeenCalled();
      expect(job.steps[0].status).toBe(JobStatus.PENDING);
    });

    it('when cancel is requested during a step, should let that step finish and stop at the next', async () => {
      const job = new Job('video-to-summary');

      await job.runStep(job.steps[0].name, async () => {
        job.requestCancel();
      });

      expect(job.steps[0].status).toBe(JobStatus.COMPLETED);
      await expect(job.runStep(job.steps[1].name, async () => 'x')).rejects.toBeInstanceOf(
        JobCancelledError,
      );
    });

    it('when the job failed and kept its request, should be retryable', () => {
      const job = new Job('video-to-summary', {}, { url: 'u' });

      job.start();
      job.fail('x');

      expect(job.retryable).toBe(true);
      expect(job.toJSON().retryable).toBe(true);
    });

    it('when the job has no request or did not fail, should not be retryable', () => {
      const old = new Job('video-to-summary');
      const running = new Job('video-to-summary', {}, { url: 'u' });

      old.fail('x');
      running.start();

      expect(old.retryable).toBe(false);
      expect(running.retryable).toBe(false);
    });

    it('when saved and restored, should keep the request', () => {
      const job = new Job('video-to-summary', {}, { url: 'u', modelId: 'm' });

      expect(Job.restore(job.snapshot()).request).toEqual({ url: 'u', modelId: 'm' });
    });

    it('when restored from an old snapshot without request, should have none', () => {
      const snapshot = new Job('video-to-summary').snapshot();

      expect(snapshot).not.toHaveProperty('request');
      expect(Job.restore(snapshot).request).toBeUndefined();
    });
  });
});
