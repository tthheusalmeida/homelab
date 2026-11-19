import { Injectable } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';

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
  constructor(
    private readonly videoService: VideoService,
    private readonly whisperService: WhisperService,
  ) {}

  async process(job: Job, videoUrl: string): Promise<void> {
    const videoPath = await this.downloadVideo(job, videoUrl);
    const audioPath = await this.convertToAudio(job, videoPath);
    await this.deleteVideo(job, videoPath);

    const segments = await this.transcribe(job, audioPath);
    await this.saveFile(job, buildTimedTranscript(segments), videoUrl);
    await this.deleteAudio(job, audioPath);
  }

  private async downloadVideo(job: Job, videoUrl: string): Promise<string> {
    return job.runStep(VideoToTranscriptSteps.DOWNLOAD_VIDEO.name, () =>
      this.videoService.download(videoUrl, `${job.id}.mp4`),
    );
  }

  private async convertToAudio(job: Job, videoPath: string): Promise<string> {
    return job.runStep(VideoToTranscriptSteps.CONVERT_TO_AUDIO.name, () =>
      this.videoService.toAudio(videoPath),
    );
  }

  private async deleteVideo(job: Job, videoPath: string): Promise<void> {
    return job.runStep(VideoToTranscriptSteps.DELETE_VIDEO.name, () =>
      this.videoService.deleteVideo(videoPath),
    );
  }

  private async transcribe(job: Job, audioPath: string): Promise<TranscriptSegment[]> {
    return job.runStep(VideoToTranscriptSteps.TRANSCRIBE.name, () =>
      this.whisperService.transcribeSegments(audioPath),
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

  private async deleteAudio(job: Job, audioPath: string): Promise<void> {
    return job.runStep(VideoToTranscriptSteps.DELETE_AUDIO.name, () =>
      this.videoService.deleteAudio(audioPath),
    );
  }
}
