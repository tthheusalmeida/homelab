import { BadRequestException } from '@nestjs/common';

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
  name?: string;
  /** Dados com que o job foi criado (guardados para tentar de novo). */
  request?: unknown;
}

/** Parte do `JobService` do back usada para criar jobs. */
export interface JobFactory {
  create(name: string, hints?: unknown, request?: unknown): JobLike;
  findById(id: string): JobLike;
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
      request,
    );

    this.deps.runner.run(job, this.deps.transcriptProcessor, request.url);

    return this.created(job);
  }

  startVideoToSummary(request: CreateVideoToSummaryRequest): JobCreated {
    const job = this.deps.jobs.create(
      JobTypeIds.VIDEO_TO_SUMMARY,
      this.deps.parseHints(request),
      request,
    );

    this.deps.runner.run(job, this.deps.summaryProcessor, request);

    return this.created(job);
  }

  /** Cria outro job com os mesmos dados de um que falhou (o original continua no histórico). */
  retry(id: string): JobCreated {
    const original = this.deps.jobs.findById(id);

    if (original.status !== 'failed') {
      throw new BadRequestException('Só dá para tentar de novo um job que falhou.');
    }

    if (original.request === undefined) {
      throw new BadRequestException(
        'Este job é antigo e não guardou os dados de criação. Crie uma nova tarefa.',
      );
    }

    switch (original.name) {
      case JobTypeIds.VIDEO_TO_TRANSCRIPT:
        return this.startVideoToTranscript(original.request as CreateVideoToTranscriptRequest);
      case JobTypeIds.VIDEO_TO_SUMMARY:
        return this.startVideoToSummary(original.request as CreateVideoToSummaryRequest);
      default:
        throw new BadRequestException('Este tipo de job não pode ser repetido.');
    }
  }

  private created(job: JobLike): JobCreated {
    return { id: job.id, status: job.status as JobStatusId };
  }
}
