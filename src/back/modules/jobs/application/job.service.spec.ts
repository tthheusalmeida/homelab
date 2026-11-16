import { NotFoundException } from '@nestjs/common';

import { JobService } from './job.service';
import { Job } from '../domain/job.entity';
import { InMemoryJobRepository } from '../infrastructure/repositories/in-memory-job.repository';

describe('JobService', () => {
  let repository: InMemoryJobRepository;
  let service: JobService;

  beforeEach(() => {
    repository = new InMemoryJobRepository();
    service = new JobService(repository);
  });

  it('when create is called with a valid type, should create and persist the job', () => {
    const job = service.create('video-to-summary');

    expect(job).toBeInstanceOf(Job);
    expect(job.name).toBe('video-to-summary');
    expect(repository.findById(job.id)).toBe(job);
  });

  it('when create is called with document hints, should keep them in the job', () => {
    const job = service.create('video-to-summary', {
      title: 'T',
      category: ['A'],
      tags: ['x'],
    });

    expect(job.documentHints).toEqual({
      title: 'T',
      category: ['A'],
      tags: ['x'],
    });
  });

  it('when create is called without hints, should have empty hints', () => {
    expect(service.create('video-to-summary').documentHints).toEqual({});
  });

  it('when create is called with an invalid type, should throw and not persist', () => {
    expect(() => service.create('invalido')).toThrow();
    expect(repository.findAll()).toHaveLength(0);
  });

  it('when findById is called with an existing id, should return the job', () => {
    const job = service.create('video-to-transcript');

    expect(service.findById(job.id)).toBe(job);
  });

  it('when findById is called with an unknown id, should throw NotFoundException', () => {
    expect(() => service.findById('nope')).toThrow(NotFoundException);
  });

  it('when findAll is called, should list the created jobs', () => {
    const a = service.create('video-to-transcript');
    const b = service.create('video-to-summary');

    expect(service.findAll()).toEqual([a, b]);
  });

  describe('deleting', () => {
    const finished = (name = 'video-to-transcript') => {
      const job = service.create(name);

      job.start();
      job.complete();
      repository.save(job);

      return job;
    };

    it('when deleting finished jobs, should remove them from the history and report them as deleted', () => {
      const a = finished();
      const b = finished();
      const keep = finished();

      expect(service.deleteMany([a.id, b.id])).toEqual({ deleted: [a.id, b.id], skipped: [] });
      expect(service.findAll()).toEqual([keep]);
    });

    it('when a job is pending or running, should not delete it and report ACTIVE', () => {
      const pending = service.create('video-to-transcript');
      const running = service.create('video-to-summary');

      running.start();

      expect(service.deleteMany([pending.id, running.id])).toEqual({
        deleted: [],
        skipped: [
          { id: pending.id, reason: 'ACTIVE' },
          { id: running.id, reason: 'ACTIVE' },
        ],
      });
      expect(service.findAll()).toHaveLength(2);
    });

    it('when the id does not exist, should report NOT_FOUND and delete the others', () => {
      const done = finished();

      expect(service.deleteMany(['nope', done.id])).toEqual({
        deleted: [done.id],
        skipped: [{ id: 'nope', reason: 'NOT_FOUND' }],
      });
    });

    it('when a failed job is deleted, should work like any finished job', () => {
      const failed = service.create('video-to-transcript');

      failed.fail('erro');

      expect(service.deleteMany([failed.id]).deleted).toEqual([failed.id]);
    });

    it('when the same id comes twice, should delete it once and not report it as not found', () => {
      const done = finished();

      expect(service.deleteMany([done.id, done.id])).toEqual({ deleted: [done.id], skipped: [] });
    });

    it('when deleting all, should remove every finished job and keep the active ones', () => {
      finished();
      finished('video-to-summary');
      const running = service.create('video-to-summary');

      running.start();

      const result = service.deleteAll();

      expect(result.deleted).toHaveLength(2);
      expect(result.skipped).toEqual([{ id: running.id, reason: 'ACTIVE' }]);
      expect(service.findAll()).toEqual([running]);
    });

    it('when deleting all with an empty history, should delete nothing', () => {
      expect(service.deleteAll()).toEqual({ deleted: [], skipped: [] });
    });

    it('when the last deletion is undone, should bring the jobs back to the history', () => {
      const a = finished();
      const b = finished();

      service.deleteMany([a.id, b.id]);

      expect(service.undoDelete()).toEqual({ restored: [a.id, b.id] });
      expect(service.findAll()).toEqual([a, b]);
    });

    it('when undoing twice, should restore nothing the second time', () => {
      const a = finished();

      service.deleteMany([a.id]);
      service.undoDelete();

      expect(service.undoDelete()).toEqual({ restored: [] });
    });

    it('when nothing was deleted yet, should restore nothing', () => {
      expect(service.undoDelete()).toEqual({ restored: [] });
    });

    it('when a second deletion happens, should undo only the latest one', () => {
      const a = finished();
      const b = finished();

      service.deleteMany([a.id]);
      service.deleteMany([b.id]);

      expect(service.undoDelete()).toEqual({ restored: [b.id] });
      expect(service.findAll()).toEqual([b]);
    });

    it('when a deletion removes nothing, should keep the previous undo available', () => {
      const a = finished();

      service.deleteMany([a.id]);
      service.deleteMany(['nope']);

      expect(service.undoDelete()).toEqual({ restored: [a.id] });
    });
  });

  describe('backup: exportar e importar', () => {
    const finished = (name = 'video-to-transcript') => {
      const job = service.create(name);

      job.start();
      job.complete();
      repository.save(job);

      return job;
    };

    it('when exporting, should answer the snapshots of every job (with their document hints)', () => {
      const job = service.create('video-to-summary', { title: 'T', tags: ['x'] });

      expect(service.exportSnapshots()).toEqual([job.snapshot()]);
      expect(service.exportSnapshots()[0].documentHints).toEqual({ title: 'T', tags: ['x'] });
    });

    it('when merging, should add only the jobs that do not exist yet and count the ones kept', () => {
      const existing = finished();
      const other = new InMemoryJobRepository();
      const source = new JobService(other);
      const fresh = source.create('video-to-summary');

      fresh.start();
      fresh.complete();

      const result = service.importSnapshots(
        [existing.snapshot(), fresh.snapshot(), { id: 'lixo' }],
        'merge',
      );

      expect(result).toEqual({ added: 1, skipped: 2 });
      expect(
        service
          .findAll()
          .map((job) => job.id)
          .sort(),
      ).toEqual([existing.id, fresh.id].sort());
    });

    it('when merging a job that already exists, should keep the current one untouched', () => {
      const existing = finished();
      const changed = { ...existing.snapshot(), error: 'do backup' };

      service.importSnapshots([changed], 'merge');

      expect(service.findById(existing.id).error).toBeUndefined();
    });

    it('when replacing, should drop the finished jobs and bring the ones from the backup', () => {
      const old = finished();
      const source = new JobService(new InMemoryJobRepository());
      const incoming = source.create('video-to-summary');

      incoming.start();
      incoming.complete();

      const result = service.importSnapshots([incoming.snapshot()], 'replace');

      expect(result).toEqual({ added: 1, skipped: 0 });
      expect(service.findAll().map((job) => job.id)).toEqual([incoming.id]);
      expect(() => service.findById(old.id)).toThrow();
    });

    it('when replacing, should keep the jobs that are pending or running now', () => {
      const running = service.create('video-to-summary');

      running.start();
      finished();

      service.importSnapshots([], 'replace');

      expect(service.findAll()).toEqual([running]);
    });

    it('when the backup has a job that was running, should bring it back as interrupted, not as running', () => {
      const source = new JobService(new InMemoryJobRepository());
      const incoming = source.create('video-to-summary');

      incoming.start();

      service.importSnapshots([incoming.snapshot()], 'merge');

      expect(service.findById(incoming.id).status).toBe('failed');
      expect(service.findById(incoming.id).error).toContain('Interrompido');
    });

    it('when the backup is empty, should add nothing', () => {
      expect(service.importSnapshots([], 'merge')).toEqual({ added: 0, skipped: 0 });
    });
  });
});
