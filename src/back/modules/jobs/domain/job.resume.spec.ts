import { Job } from './job.entity';
import { JobStatus } from './job-status.enum';

const failedAt = (stepName: string): Job => {
  const job = new Job('video-to-summary', {}, { url: 'u' });
  const names = job.steps.map((step) => step.name);

  job.start();

  for (const name of names) {
    if (name === stepName) {
      job.startStep(name);
      job.failStep(name);
      break;
    }

    job.startStep(name);
    job.completeStep(name);
  }

  job.fail('caiu');

  return job;
};

describe('Job: retomada', () => {
  it('when reset for retry, should go back to pending without error or dates', () => {
    const job = failedAt('transcribe');

    job.requestCancel();
    job.resetForRetry();

    expect(job.status).toBe(JobStatus.PENDING);
    expect(job.error).toBeUndefined();
    expect(job.errorInfo).toBeUndefined();
    expect(job.startedAt).toBeUndefined();
    expect(job.cancelRequested).toBe(false);
  });

  it('when reset for retry, should keep completed steps and reopen the failed one and the next ones', () => {
    const job = failedAt('transcribe');

    job.resetForRetry();

    expect(job.steps.map((step) => step.status)).toEqual([
      JobStatus.COMPLETED,
      JobStatus.COMPLETED,
      JobStatus.COMPLETED,
      JobStatus.PENDING,
      JobStatus.PENDING,
      JobStatus.PENDING,
      JobStatus.PENDING,
    ]);
  });

  it('when reset for retry, should keep the same id and be able to start again', () => {
    const job = failedAt('summarize');
    const id = job.id;

    job.resetForRetry();
    job.start();

    expect(job.id).toBe(id);
    expect(job.status).toBe(JobStatus.RUNNING);
  });

  it('when the request is replaced, should expose the new one', () => {
    const job = failedAt('summarize');

    job.replaceRequest({ url: 'u', modelId: 'outro' });

    expect(job.request).toEqual({ url: 'u', modelId: 'outro' });
    expect(job.snapshot().request).toEqual({ url: 'u', modelId: 'outro' });
  });

  it('when resetting steps from one, should reopen it and every step after it', () => {
    const job = failedAt('save-file');

    job.resetStepsFrom('convert-to-audio');

    expect(job.steps.map((step) => step.status).slice(0, 3)).toEqual([
      JobStatus.COMPLETED,
      JobStatus.PENDING,
      JobStatus.PENDING,
    ]);
  });

  it('when resetting from an unknown step, should fail', () => {
    expect(() => failedAt('summarize').resetStepsFrom('nada')).toThrow('não existe');
  });

  it('when a step is skipped, should become completed and notify once', () => {
    const job = new Job('video-to-summary');
    const listener = jest.fn();

    job.observe(listener);
    job.skipStep('download-video');
    job.skipStep('download-video');

    expect(job.isStepCompleted('download-video')).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('when steps change, should notify the observer for start, completion and failure', () => {
    const job = new Job('video-to-summary');
    const listener = jest.fn();

    job.observe(listener);
    job.startStep('download-video');
    job.completeStep('download-video');
    job.startStep('convert-to-audio');
    job.failStep('convert-to-audio');

    expect(listener).toHaveBeenCalledTimes(4);
  });

  it('when the observer is removed, should stop notifying', () => {
    const job = new Job('video-to-summary');
    const listener = jest.fn();

    job.observe(listener);
    job.observe(undefined);
    job.startStep('download-video');

    expect(listener).not.toHaveBeenCalled();
  });
});

describe('Job: porcentagem da etapa', () => {
  it('when a percent is set, should expose it with the percent unit', () => {
    const job = new Job('video-to-summary');

    job.setPercent(42.9);

    expect(job.progress).toEqual({ done: 42, total: 100, unit: 'percent' });
    expect(job.toJSON().progress).toEqual({ done: 42, total: 100, unit: 'percent' });
  });

  it('when the percent is out of range, should keep it between 0 and 100', () => {
    const job = new Job('video-to-summary');

    job.setPercent(250);
    expect(job.progress?.done).toBe(100);

    job.setPercent(-5);
    expect(job.progress?.done).toBe(0);
  });

  it('when a part advances, should drop the retry note of the previous part', () => {
    const job = new Job('pdf-to-summary');

    job.setNote('Tentando de novo (tentativa 2 de 3): erro');
    job.setProgress(2, 5);

    expect(job.note).toBeUndefined();
    expect(job.progress).toEqual({ done: 2, total: 5 });
  });

  it('when the next step starts, should start it at 0% instead of keeping the previous percent', () => {
    const job = new Job('video-to-summary');

    job.setPercent(80);
    job.startStep('convert-to-audio');

    expect(job.progress).toEqual({ done: 0, total: 100, unit: 'percent' });
  });

  it('when a step without a measure completes, should drop its progress', () => {
    const job = new Job('video-to-summary');

    job.startStep('delete-video');
    job.completeStep('delete-video');

    expect(job.progress).toBeUndefined();
  });

  it('when a step fails, should drop its progress', () => {
    const job = new Job('video-to-summary');

    job.startStep('transcribe');
    job.setPercent(30);
    job.failStep('transcribe');

    expect(job.progress).toBeUndefined();
  });
});
