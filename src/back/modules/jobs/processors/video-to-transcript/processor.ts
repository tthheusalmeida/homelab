import { Injectable, Optional } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';
import { ensureAudio, removeAudioStep, skipToTranscript } from '../../domain/video-pipeline';
import { JobArtifactStore, MemoryJobArtifactStore } from '../../infrastructure/job-artifact.store';

import { VideoService } from '../../../video/video.service';
import { TranscriptSegment, WhisperService } from '../../../ai/whisper/whisper.service';
import { VideoToTranscriptSteps } from './steps';
import { buildTimedTranscript } from './timed-transcript';

import { newPendingMeta } from '../../../library/domain/document';
import { serializeDocument } from '../../../library/domain/frontmatter';
import { buildBaseName } from '../../../library/domain/naming';
import { DocumentTypeOptions } from '../../../library/domain/library.types';

@Injectable()
export class VideoToTranscriptJobProcessor implements JobProcessor<string, string> {
  private readonly artifacts: JobArtifactStore;

  constructor(
    private readonly videoService: VideoService,
    private readonly whisperService: WhisperService,
    // Sem ele (testes), o resultado das etapas fica só na memória.
    @Optional() artifacts?: JobArtifactStore,
  ) {
    this.artifacts = artifacts ?? new MemoryJobArtifactStore();
  }

  /**
   * Cada etapa concluída deixa o resultado em disco (vídeo, áudio, transcrição): retomar o mesmo
   * job continua da etapa que parou, sem baixar nem transcrever de novo o que já ficou pronto.
   */
  async process(job: Job, videoUrl: string): Promise<void> {
    const steps = {
      download: VideoToTranscriptSteps.DOWNLOAD_VIDEO.name,
      convert: VideoToTranscriptSteps.CONVERT_TO_AUDIO.name,
      deleteVideo: VideoToTranscriptSteps.DELETE_VIDEO.name,
      transcribe: VideoToTranscriptSteps.TRANSCRIBE.name,
    };
    const saved = await this.artifacts.load(job.id);
    let audioPath = saved.audioPath;
    let resumed = true;
    let segments = saved.segments;

    if (segments) {
      skipToTranscript(job, steps);
    } else {
      const audio = await ensureAudio(job, this.artifacts, this.videoService, steps, videoUrl);

      audioPath = audio.audioPath;
      resumed = audio.resumed;
      segments = await this.transcribe(job, audioPath);
      await this.artifacts.save(job.id, { segments });
    }

    if (!job.isStepCompleted(VideoToTranscriptSteps.SAVE_FILE.name)) {
      await this.saveFile(job, buildTimedTranscript(segments), videoUrl);
    }

    if (audioPath) {
      await removeAudioStep(
        job,
        this.videoService,
        VideoToTranscriptSteps.DELETE_AUDIO.name,
        audioPath,
        resumed,
      );
    } else {
      job.skipStep(VideoToTranscriptSteps.DELETE_AUDIO.name);
    }

    await this.artifacts.clear(job.id);
  }

  private async transcribe(job: Job, audioPath: string): Promise<TranscriptSegment[]> {
    return job.runStep(VideoToTranscriptSteps.TRANSCRIBE.name, () =>
      this.whisperService.transcribeSegments(
        audioPath,
        (percent) => job.setPercent(percent),
        job.signal,
      ),
    );
  }

  private async saveFile(job: Job, transcription: string, videoUrl: string): Promise<string> {
    const meta = newPendingMeta({
      id: job.id,
      title: job.documentHints.title ?? job.label ?? 'Transcrição de vídeo',
      type: DocumentTypeOptions.TRANSCRIPTION,
      sourceUrl: videoUrl,
      category: job.documentHints.category,
      tags: job.documentHints.tags,
    });

    return job.runStep(VideoToTranscriptSteps.SAVE_FILE.name, () =>
      this.videoService.saveFile(
        serializeDocument(meta, transcription),
        buildBaseName(meta.title, job.id),
        '.md',
      ),
    );
  }
}
