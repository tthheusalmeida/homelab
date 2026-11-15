import { Logger } from '@nestjs/common';

import type { JsonFile } from '../../../../../storage/json-file';
import { Job, type JobSnapshot } from '../../domain/job.entity';
import { JobStatus } from '../../domain/job-status.enum';
import type { JobRepository, JobsStartupReport } from './job.repository';

export const JOBS_FILE_VERSION = 1;

export interface JobsFileData {
  version: number;
  jobs: JobSnapshot[];
}

/** Avisa que algo não pôde ser gravado (o histórico continua válido em memória). */
export type PersistFailureListener = (reason: string) => void;

const STATUSES = new Set<string>(Object.values(JobStatus));

export function isJobSnapshot(value: unknown): value is JobSnapshot {
  const job = value as Partial<JobSnapshot> | null;

  return (
    typeof job === 'object' &&
    job !== null &&
    typeof job.id === 'string' &&
    typeof job.name === 'string' &&
    typeof job.createdAt === 'string' &&
    typeof job.status === 'string' &&
    STATUSES.has(job.status) &&
    Array.isArray(job.steps)
  );
}

/**
 * Histórico de jobs em um único `jobs.json` (escrita atômica, com cópia `.bak`). Lê tudo ao abrir e
 * regrava o arquivo a cada mudança. **Nunca lança ao gravar**: o runner de jobs chama `save` dentro
 * do próprio tratamento de falha, então um erro de disco aqui só vira aviso ao usuário e o job
 * continua valendo em memória.
 */
export class FileJobRepository implements JobRepository {
  private readonly jobs = new Map<string, Job>();
  private readonly logger = new Logger(FileJobRepository.name);
  private readonly report: JobsStartupReport = {
    interrupted: [],
    recoveredFromBackup: false,
    unreadable: false,
  };

  constructor(
    private readonly file: JsonFile<JobsFileData>,
    private readonly onPersistFailure: PersistFailureListener = () => undefined,
  ) {
    this.load();
  }

  save(job: Job): void {
    this.jobs.set(job.id, job);
    this.persist();
  }

  findById(id: string): Job | null {
    return this.jobs.get(id) ?? null;
  }

  findAll(): Job[] {
    return [...this.jobs.values()];
  }

  remove(ids: string[]): string[] {
    const removed = ids.filter((id) => this.jobs.delete(id));

    if (removed.length > 0) {
      this.persist();
    }

    return removed;
  }

  startupReport(): JobsStartupReport {
    return { ...this.report, interrupted: [...this.report.interrupted] };
  }

  private load(): void {
    let data: JobsFileData | null = null;

    try {
      data = this.file.read();
      this.report.recoveredFromBackup = this.file.recovered;
    } catch {
      this.report.unreadable = true;
      this.file.quarantine();
    }

    const snapshots = (Array.isArray(data?.jobs) ? data.jobs : []).filter(isJobSnapshot);

    snapshots
      // o id (uuidv7) é ordenado no tempo e desempata jobs criados no mesmo milissegundo
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .forEach((snapshot) => this.jobs.set(snapshot.id, Job.restore(snapshot)));

    this.interruptUnfinished();
  }

  /** A fila só existe em memória: o que estava pendente ou rodando não retoma, então falha. */
  private interruptUnfinished(): void {
    for (const job of this.jobs.values()) {
      if (job.status === JobStatus.PENDING || job.status === JobStatus.RUNNING) {
        job.interrupt();
        this.report.interrupted.push(job.id);
      }
    }

    if (this.report.interrupted.length > 0) {
      this.persist();
    }
  }

  private persist(): void {
    try {
      this.file.write({
        version: JOBS_FILE_VERSION,
        jobs: [...this.jobs.values()].map((job) => job.snapshot()),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'erro desconhecido';

      this.logger.error(`Não foi possível gravar o histórico de jobs: ${reason}`);
      this.onPersistFailure(reason);
    }
  }
}
