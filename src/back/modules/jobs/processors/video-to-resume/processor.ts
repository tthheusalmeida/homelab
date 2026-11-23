import { Injectable, Optional } from '@nestjs/common';

import { Job } from '../../domain/job.entity';
import { JobProcessor } from '../../domain/job-processor.interface';
import { retryNote } from '../../domain/retry-note';
import { ensureAudio, removeAudioStep, skipToTranscript } from '../../domain/video-pipeline';
import { JobArtifactStore, MemoryJobArtifactStore } from '../../infrastructure/job-artifact.store';

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
  private readonly artifacts: JobArtifactStore;

  constructor(
    private readonly videoService: VideoService,
    private readonly whisperService: WhisperService,
    // Sem ele (testes), vale sempre o prompt padrão.
    @Optional() private readonly prompts?: PromptService,
    // Sem ele (testes), o resultado das etapas fica só na memória.
    @Optional() artifacts?: JobArtifactStore,
  ) {
    this.artifacts = artifacts ?? new MemoryJobArtifactStore();
  }

  /**
   * Cada etapa concluída deixa o resultado em disco (vídeo, áudio, transcrição, resumo): retomar o
   * mesmo job continua da etapa que parou, mesmo com outra IA, sem repetir o que já ficou pronto.
   */
  async process(job: Job, input: VideoToSummaryDto): Promise<void> {
    const steps = {
      download: VideoToResumeSteps.DOWNLOAD_VIDEO.name,
      convert: VideoToResumeSteps.CONVERT_TO_AUDIO.name,
      deleteVideo: VideoToResumeSteps.DELETE_VIDEO.name,
      transcribe: VideoToResumeSteps.TRANSCRIBE.name,
    };
    const saved = await this.artifacts.load(job.id);
    let audioPath = saved.audioPath;
    let resumed = true;
    let transcript = saved.transcript;
    let summary = saved.summary;

    if (summary !== undefined || transcript !== undefined) {
      skipToTranscript(job, steps);
    } else {
      const audio = await ensureAudio(job, this.artifacts, this.videoService, steps, input.url);

      audioPath = audio.audioPath;
      resumed = audio.resumed;
      transcript = removeAllegedAuthorship(normalizeText(await this.transcribe(job, audioPath)));
      await this.artifacts.save(job.id, { transcript });
    }

    if (summary === undefined) {
      const detail = isSummaryDetail(input.detail) ? input.detail : DEFAULT_SUMMARY_DETAIL;

      summary = await this.summarize(job, transcript ?? '', {
        providerId: input.providerId,
        modelId: input.modelId,
        thinking: input.thinking,
        detail,
      });
      await this.artifacts.save(job.id, { summary });
    } else {
      job.skipStep(VideoToResumeSteps.SUMMARIZE.name);
    }

    if (!job.isStepCompleted(VideoToResumeSteps.SAVE_FILE.name)) {
      await this.saveFile(job, summary, input.url);
    }

    if (audioPath) {
      await removeAudioStep(
        job,
        this.videoService,
        VideoToResumeSteps.DELETE_AUDIO.name,
        audioPath,
        resumed,
      );
    } else {
      job.skipStep(VideoToResumeSteps.DELETE_AUDIO.name);
    }

    await this.artifacts.clear(job.id);
  }

  private async transcribe(job: Job, audioPath: string): Promise<string> {
    return job.runStep(VideoToResumeSteps.TRANSCRIBE.name, () =>
      this.whisperService.transcribe(audioPath, (percent) => job.setPercent(percent), job.signal),
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
        { ...options, onRetry: (info) => job.setNote(retryNote(info)), signal: job.signal },
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
}
