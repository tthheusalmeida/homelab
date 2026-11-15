import { Injectable } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobRepository, type JobsStartupReport } from './job.repository';

@Injectable()
export class InMemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, Job>();

  save(job: Job): void {
    this.jobs.set(job.id, job);
  }

  findById(id: string): Job | null {
    return this.jobs.get(id) ?? null;
  }

  findAll(): Job[] {
    return [...this.jobs.values()];
  }

  remove(ids: string[]): string[] {
    return ids.filter((id) => this.jobs.delete(id));
  }

  startupReport(): JobsStartupReport {
    return { interrupted: [], recoveredFromBackup: false, unreadable: false };
  }
}
