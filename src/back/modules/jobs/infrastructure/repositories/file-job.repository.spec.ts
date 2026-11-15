import * as fs from 'node:fs';
import * as path from 'node:path';

import { makeTempDir, removeDir } from '../../../../../settings/settings.testing';
import { JsonFile } from '../../../../../storage/json-file';
import { INTERRUPTED_JOB_ERROR, Job } from '../../domain/job.entity';
import { JobStatus } from '../../domain/job-status.enum';

import { FileJobRepository, type JobsFileData } from './file-job.repository';

describe('FileJobRepository', () => {
  let dir: string;
  let target: string;
  let failures: string[];

  const create = () =>
    new FileJobRepository(new JsonFile<JobsFileData>(target), (reason) => failures.push(reason));

  const finishedJob = (name = 'video-to-summary', hints = {}) => {
    const job = new Job(name, hints);

    job.start();
    job.complete();

    return job;
  };

  beforeEach(() => {
    dir = makeTempDir();
    target = path.join(dir, 'data', 'jobs.json');
    failures = [];
  });

  afterEach(() => removeDir(dir));

  it('when there is no file yet, should start empty without creating one', () => {
    const repository = create();

    expect(repository.findAll()).toEqual([]);
    expect(fs.existsSync(target)).toBe(false);
    expect(repository.startupReport()).toEqual({
      interrupted: [],
      recoveredFromBackup: false,
      unreadable: false,
    });
  });

  it('when saving a job, should write the file right away and survive a reload with every field', () => {
    const repository = create();
    const job = finishedJob('video-to-summary', { title: 'T', tags: ['x'] });

    repository.save(job);

    const reloaded = create().findById(job.id);

    expect(reloaded).not.toBeNull();
    expect(reloaded?.status).toBe(JobStatus.COMPLETED);
    expect(reloaded?.documentHints).toEqual({ title: 'T', tags: ['x'] });
    expect(reloaded?.createdAt).toEqual(job.createdAt);
    expect(reloaded?.steps).toEqual(job.steps);
  });

  it('when a job changes and is saved again, should keep a single entry with the latest state', () => {
    const repository = create();
    const job = new Job('video-to-transcript');

    repository.save(job);
    job.start();
    job.complete();
    repository.save(job);

    const reloaded = create();

    expect(reloaded.findAll()).toHaveLength(1);
    expect(reloaded.findAll()[0].status).toBe(JobStatus.COMPLETED);
  });

  it('when reloading, should list the jobs by creation date even if the file was written out of order', () => {
    const repository = create();
    const first = finishedJob();
    const second = finishedJob();
    const third = finishedJob();

    repository.save(third);
    repository.save(first);
    repository.save(second);

    expect(
      create()
        .findAll()
        .map((job) => job.id),
    ).toEqual(
      [first, second, third]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
        .map((job) => job.id),
    );
  });

  it('when removing jobs, should delete them from memory and from the file and answer only the ids that existed', () => {
    const repository = create();
    const a = finishedJob();
    const b = finishedJob();

    repository.save(a);
    repository.save(b);

    expect(repository.remove([a.id, 'nope'])).toEqual([a.id]);
    expect(
      create()
        .findAll()
        .map((job) => job.id),
    ).toEqual([b.id]);
  });

  it('when removing nothing that exists, should not rewrite the file', () => {
    const repository = create();

    repository.save(finishedJob());
    const before = fs.statSync(target).mtimeMs;

    repository.remove(['nope']);

    expect(fs.statSync(target).mtimeMs).toBe(before);
  });

  it('when jobs were pending or running at startup, should fail them as interrupted, save that and report their ids', () => {
    const repository = create();
    const pending = new Job('video-to-summary');
    const running = new Job('video-to-summary');
    const done = finishedJob();

    running.start();
    running.startStep(running.steps[0].name);
    [pending, running, done].forEach((job) => repository.save(job));

    const reopened = create();

    expect(reopened.findById(pending.id)?.status).toBe(JobStatus.FAILED);
    expect(reopened.findById(pending.id)?.error).toBe(INTERRUPTED_JOB_ERROR);
    expect(reopened.findById(running.id)?.steps[0].status).toBe(JobStatus.FAILED);
    expect(reopened.findById(done.id)?.status).toBe(JobStatus.COMPLETED);
    expect(reopened.startupReport().interrupted.sort()).toEqual([pending.id, running.id].sort());
    expect(create().startupReport().interrupted).toEqual([]);
  });

  it('when the main file is corrupt but the backup is good, should recover from the backup and report it', () => {
    const repository = create();
    const first = finishedJob();
    const second = finishedJob();

    repository.save(first);
    repository.save(second);
    fs.writeFileSync(target, '{ quebrado');

    const reopened = create();

    expect(reopened.findAll().map((job) => job.id)).toEqual([first.id]);
    expect(reopened.startupReport().recoveredFromBackup).toBe(true);
    expect(reopened.startupReport().unreadable).toBe(false);
  });

  it('when neither the file nor a backup can be read, should start empty, keep the corrupt file and report it', () => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '{ quebrado');

    const repository = create();

    expect(repository.findAll()).toEqual([]);
    expect(repository.startupReport().unreadable).toBe(true);
    expect(fs.readFileSync(`${target}.corrupt`, 'utf8')).toBe('{ quebrado');
  });

  it('when some entries in the file are malformed, should ignore only those', () => {
    const good = finishedJob();

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(
      target,
      JSON.stringify({
        version: 1,
        jobs: [good.snapshot(), { id: 5 }, null, { ...good.snapshot(), id: 'x', status: 'zumbi' }],
      }),
    );

    expect(
      create()
        .findAll()
        .map((job) => job.id),
    ).toEqual([good.id]);
  });

  it('when the file is valid JSON but has no jobs list, should start empty', () => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify({ version: 1 }));

    expect(create().findAll()).toEqual([]);
  });

  it('when writing to disk fails, should not throw, keep the job in memory and tell the listener why', () => {
    const repository = create();
    const job = finishedJob();
    const write = jest.spyOn(JsonFile.prototype, 'write').mockImplementation(() => {
      throw new Error('disco cheio');
    });

    try {
      expect(() => repository.save(job)).not.toThrow();
    } finally {
      write.mockRestore();
    }

    expect(repository.findById(job.id)).toBe(job);
    expect(failures).toEqual(['disco cheio']);
  });

  it('when a job type from an old version no longer exists, should still load it', () => {
    const old = { ...finishedJob().snapshot(), name: 'tipo-antigo' };

    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, JSON.stringify({ version: 1, jobs: [old] }));

    expect(create().findById(old.id)?.name).toBe('tipo-antigo');
  });
});
