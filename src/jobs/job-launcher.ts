import {
  JobTypeIds,
  type CreateVideoToSummaryRequest,
  type CreateVideoToTranscriptRequest,
  type JobCreated,
  type JobStatusId,
} from '../shared/contracts/jobs';

interface JobLike {
  id: string;
  status: string;
}

/** Parte do `JobService` do back usada para criar jobs. */
export interface JobFactory {
  create(name: string, hints?: unknown): JobLike;
}

/** Fila do back (`JobRunner`): um job por vez, na ordem de chegada. */
export interface JobQueue {
  run(job: JobLike, processor: unknown, input: unknown): void;
}

export interface JobLauncherDeps {
  jobs: JobFactory;
  runner: JobQueue;
  transcriptProcessor: unknown;
  summaryProcessor: unknown;
  /** `parseDocumentHints` do back: valida título, categoria e tags (lança 400 se inválidos). */
  parseHints: (raw: unknown) => unknown;
}

/**
 * Faz o que os endpoints `POST jobs/video-to-*` faziam: valida as dicas **antes** de criar o job,
 * cria, enfileira e responde na hora `{ id, status }` (o job segue na fila e o acompanhamento é
 * por consulta). Dica inválida lança antes de criar qualquer job.
 */
export class JobLauncher {
  constructor(private readonly deps: JobLauncherDeps) {}

  startVideoToTranscript(request: CreateVideoToTranscriptRequest): JobCreated {
    const job = this.deps.jobs.create(
      JobTypeIds.VIDEO_TO_TRANSCRIPT,
      this.deps.parseHints(request),
    );

    this.deps.runner.run(job, this.deps.transcriptProcessor, request.url);

    return this.created(job);
  }

  startVideoToSummary(request: CreateVideoToSummaryRequest): JobCreated {
    const job = this.deps.jobs.create(JobTypeIds.VIDEO_TO_SUMMARY, this.deps.parseHints(request));

    this.deps.runner.run(job, this.deps.summaryProcessor, request);

    return this.created(job);
  }

  private created(job: JobLike): JobCreated {
    return { id: job.id, status: job.status as JobStatusId };
  }
}
