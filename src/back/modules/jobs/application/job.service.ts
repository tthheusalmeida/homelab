import { Injectable, Inject, NotFoundException } from '@nestjs/common';

import type { RecordImportResult, RestoreMode } from '../../../../shared/contracts/backup';
import type { JobDeleteResult } from '../../../../shared/contracts/jobs';
import type { DocumentHints } from '../domain/document-hints';
import { Job, type JobSnapshot } from '../domain/job.entity';
import { isJobSnapshot } from '../infrastructure/repositories/file-job.repository';
import { JobStatus } from '../domain/job-status.enum';
import { JOB_REPOSITORY } from '../infrastructure/repositories/job.repository';
import { type JobRepository } from '../infrastructure/repositories/job.repository';

@Injectable()
export class JobService {
  constructor(
    @Inject(JOB_REPOSITORY)
    private readonly repository: JobRepository,
  ) {}

  create(name: string, documentHints?: DocumentHints): Job {
    const job = new Job(name, documentHints);

    this.repository.save(job);

    return job;
  }

  findById(id: string): Job {
    const job = this.repository.findById(id);

    if (!job) {
      throw new NotFoundException(`Job "${id}" não encontrado`);
    }

    return job;
  }

  findAll(): Job[] {
    return this.repository.findAll();
  }

  /** Jobs na fila ou rodando: não podem ser excluídos. */
  private isActive(job: Job): boolean {
    return job.status === JobStatus.PENDING || job.status === JobStatus.RUNNING;
  }

  /** Exclui do histórico os jobs informados; os ativos ficam e voltam em `skipped`. */
  deleteMany(ids: string[]): JobDeleteResult {
    const skipped: JobDeleteResult['skipped'] = [];
    const removable: string[] = [];

    for (const id of new Set(ids)) {
      const job = this.repository.findById(id);

      if (!job) {
        skipped.push({ id, reason: 'NOT_FOUND' });
      } else if (this.isActive(job)) {
        skipped.push({ id, reason: 'ACTIVE' });
      } else {
        removable.push(id);
      }
    }

    return { deleted: this.repository.remove(removable), skipped };
  }

  /** Exclui todo o histórico, menos o que está na fila ou rodando. */
  deleteAll(): JobDeleteResult {
    return this.deleteMany(this.repository.findAll().map((job) => job.id));
  }

  /** Todo o histórico, no formato de disco (usado pelo backup). */
  exportSnapshots(): JobSnapshot[] {
    return this.repository.findAll().map((job) => job.snapshot());
  }

  /**
   * Traz jobs de um backup. `merge` só adiciona os que não existem; `replace` troca o histórico
   * pelo do backup, **mantendo** os jobs na fila ou rodando. Job do backup que estava ativo volta
   * como interrompido (a fila não existe mais). Entradas inválidas são ignoradas.
   */
  importSnapshots(raw: unknown[], mode: RestoreMode): RecordImportResult {
    const incoming = raw.filter(isJobSnapshot);

    if (mode === 'replace') {
      this.repository.remove(
        this.repository
          .findAll()
          .filter((job) => !this.isActive(job))
          .map((job) => job.id),
      );
    }

    let added = 0;

    for (const snapshot of incoming) {
      if (this.repository.findById(snapshot.id)) {
        continue;
      }

      const job = Job.restore(snapshot);

      if (this.isActive(job)) {
        job.interrupt();
      }

      this.repository.save(job);
      added += 1;
    }

    return { added, skipped: raw.length - added };
  }

  /** O que aconteceu com o histórico ao abrir o app (jobs interrompidos, arquivo recuperado...). */
  startupReport() {
    return this.repository.startupReport();
  }
}
