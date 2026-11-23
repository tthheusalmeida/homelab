import * as os from 'node:os';
import * as path from 'node:path';

import { Module } from '@nestjs/common';

import { JobService } from './application/job.service';
import { JobRunner } from './application/job-runner.service';

import {
  FileJobRepository,
  type JobsFileData,
} from './infrastructure/repositories/file-job.repository';
import { InMemoryJobRepository } from './infrastructure/repositories/in-memory-job.repository';
import { JOB_REPOSITORY } from './infrastructure/repositories/job.repository';

import { BackAlerts } from '../../config/back-alerts';
import { BackConfig } from '../../config/back-config';
import { JsonFile } from '../../../storage/json-file';
import { AIModule } from '../ai/ai.module';
import { VideoModule } from '../video/video.module';
import { LibraryModule } from '../library/library.module';
import { VideoToTranscriptJobProcessor } from './processors/video-to-transcript/processor';
import { VideoToSummaryJobProcessor } from './processors/video-to-resume/processor';
import { PdfToSummaryJobProcessor } from './processors/pdf-to-summary/processor';
import { PdfCheckpointStore } from '../pdf/pdf-checkpoint.store';
import {
  FileJobArtifactStore,
  JobArtifactStore,
  MemoryJobArtifactStore,
} from './infrastructure/job-artifact.store';

@Module({
  imports: [VideoModule, AIModule, LibraryModule],
  providers: [
    JobService,
    JobRunner,

    VideoToTranscriptJobProcessor,
    VideoToSummaryJobProcessor,
    PdfToSummaryJobProcessor,

    {
      provide: JobArtifactStore,
      inject: [BackConfig],
      // Resultado de cada etapa em disco, ao lado do áudio temporário (sem pasta, só na memória).
      useFactory: (config: BackConfig) =>
        config.audioTempDir
          ? new FileJobArtifactStore(config.audioTempDir)
          : new MemoryJobArtifactStore(),
    },

    {
      provide: PdfCheckpointStore,
      inject: [BackConfig],
      // Sem pasta configurada (testes), usa uma pasta temporária do sistema.
      useFactory: (config: BackConfig) =>
        new PdfCheckpointStore(config.pdfWorkDir ?? path.join(os.tmpdir(), 'homelab-pdf')),
    },

    {
      provide: JOB_REPOSITORY,
      inject: [BackConfig, BackAlerts],
      // Com `jobsFile` o histórico fica em disco; sem ele (testes) só em memória.
      useFactory: (config: BackConfig, alerts: BackAlerts) =>
        config.jobsFile
          ? new FileJobRepository(new JsonFile<JobsFileData>(config.jobsFile), (reason) =>
              alerts.persistFailed('o histórico de processos', reason),
            )
          : new InMemoryJobRepository(),
    },
  ],
  exports: [
    JobService,
    JobRunner,
    VideoToTranscriptJobProcessor,
    VideoToSummaryJobProcessor,
    PdfToSummaryJobProcessor,
    PdfCheckpointStore,
    JobArtifactStore,
  ],
})
export class JobsModule {}
