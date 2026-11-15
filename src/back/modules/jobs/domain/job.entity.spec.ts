import { INTERRUPTED_JOB_ERROR, Job } from './job.entity';
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
        'completedAt',
        'createdAt',
        'error',
        'id',
        'label',
        'name',
        'startedAt',
        'status',
        'steps',
      ].sort(),
    );
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
});
