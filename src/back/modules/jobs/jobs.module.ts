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
import { VideoToTranscriptJobProcessor } from './processors/video-to-transcript/processor';
import { VideoToSummaryJobProcessor } from './processors/video-to-resume/processor';

@Module({
  imports: [VideoModule, AIModule],
  providers: [
    JobService,
    JobRunner,

    VideoToTranscriptJobProcessor,
    VideoToSummaryJobProcessor,

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
  exports: [JobService, JobRunner, VideoToTranscriptJobProcessor, VideoToSummaryJobProcessor],
})
export class JobsModule {}
