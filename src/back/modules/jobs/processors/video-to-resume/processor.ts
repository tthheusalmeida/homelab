import { Injectable, Optional } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';
import { retryNote } from '../../domain/retry-note';

import { normalizeText, removeAllegedAuthorship } from '../../../../utils/text';
import { VideoToSummaryDto } from './dto/video-to-summary.dto';

import {
  buildSummaryPrompt,
  DEFAULT_SUMMARY_DETAIL,
  isSummaryDetail,
} from '../../../ai/prompts/summary-specialist.prompt';
import { PromptService } from '../../../ai/prompts/prompt.service';
import { WhisperService } from '../../../ai/whisper/whisper.service';
import { VideoService, VideoSummarizeOptions } from '../../../video/video.service';

import { VideoToResumeSteps } from './steps';

import { newPendingMeta } from '../../../library/domain/document';
import { serializeDocument } from '../../../library/domain/frontmatter';
import { buildBaseName } from '../../../library/domain/naming';
import { DocumentTypeOptions } from '../../../library/domain/library.types';

@Injectable()
export class VideoToSummaryJobProcessor implements JobProcessor<VideoToSummaryDto, string> {
  constructor(
    private readonly videoService: VideoService,
    private readonly whisperService: WhisperService,
    // Sem ele (testes), vale sempre o prompt padrão.
    @Optional() private readonly prompts?: PromptService,
  ) {}

  async process(job: Job, input: VideoToSummaryDto): Promise<void> {
    const videoPath = await this.downloadVideo(job, input.url);
    const audioPath = await this.convertToAudio(job, videoPath);
    await this.deleteVideo(job, videoPath);

    const rawTranscription = await this.transcribe(job, audioPath);
    const transcription = removeAllegedAuthorship(normalizeText(rawTranscription));
    const detail = isSummaryDetail(input.detail) ? input.detail : DEFAULT_SUMMARY_DETAIL;
    const summary = await this.summarize(job, transcription, {
      providerId: input.providerId,
      modelId: input.modelId,
      thinking: input.thinking,
      detail,
    });

    await this.saveFile(job, summary, input.url);
    await this.deleteAudio(job, audioPath);
  }

  private async downloadVideo(job: Job, videoUrl: string): Promise<string> {
    return job.runStep(VideoToResumeSteps.DOWNLOAD_VIDEO.name, () =>
      this.videoService.download(videoUrl, `${job.id}.mp4`),
    );
  }

  private async convertToAudio(job: Job, videoPath: string): Promise<string> {
    return job.runStep(VideoToResumeSteps.CONVERT_TO_AUDIO.name, () =>
      this.videoService.toAudio(videoPath),
    );
  }

  private async deleteVideo(job: Job, videoPath: string): Promise<void> {
    return job.runStep(VideoToResumeSteps.DELETE_VIDEO.name, () =>
      this.videoService.deleteVideo(videoPath),
    );
  }

  private async transcribe(job: Job, audioPath: string): Promise<string> {
    return job.runStep(VideoToResumeSteps.TRANSCRIBE.name, () =>
      this.whisperService.transcribe(audioPath),
    );
  }

  private async summarize(
    job: Job,
    transcription: string,
    options: VideoSummarizeOptions,
  ): Promise<string> {
    return job.runStep(VideoToResumeSteps.SUMMARIZE.name, () =>
      this.videoService.summarize(
        buildSummaryPrompt(
          options.detail ?? DEFAULT_SUMMARY_DETAIL,
          this.prompts?.instructionsFor('summary'),
        ),
        transcription,
        // Enquanto a IA tenta de novo, a tela mostra "tentativa x de y".
        { ...options, onRetry: (info) => job.setNote(retryNote(info)) },
      ),
    );
  }

  private async saveFile(job: Job, summary: string, videoUrl: string): Promise<string> {
    const meta = newPendingMeta({
      id: job.id,
      title: job.documentHints.title ?? job.label ?? 'Resumo de vídeo',
      type: DocumentTypeOptions.SUMMARY,
      sourceUrl: videoUrl,
      category: job.documentHints.category,
      tags: job.documentHints.tags,
    });

    return job.runStep(VideoToResumeSteps.SAVE_FILE.name, () =>
      this.videoService.saveFile(
        serializeDocument(meta, summary),
        buildBaseName(meta.title, job.id),
        '.md',
      ),
    );
  }

  private async deleteAudio(job: Job, audioPath: string): Promise<void> {
    return job.runStep(VideoToResumeSteps.DELETE_AUDIO.name, () =>
      this.videoService.deleteAudio(audioPath),
    );
  }
}
