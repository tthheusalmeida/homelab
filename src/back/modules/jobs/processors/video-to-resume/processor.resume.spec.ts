import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { Job } from '../../domain/job.entity';
import { JobStatus } from '../../domain/job-status.enum';
import { FileJobArtifactStore } from '../../infrastructure/job-artifact.store';
import type { WhisperService } from '../../../ai/whisper/whisper.service';
import type { VideoService } from '../../../video/video.service';

import { VideoToSummaryJobProcessor } from './processor';

const dto = {
  url: 'http://x/v.mp4',
  providerId: 'ollama' as const,
  modelId: 'm',
  thinking: 'on',
};

describe('VideoToSummaryJobProcessor: retomada', () => {
  let dir: string;
  let video: Record<
    'download' | 'toAudio' | 'deleteVideo' | 'summarize' | 'saveFile' | 'deleteAudio',
    jest.Mock
  >;
  let whisper: { transcribe: jest.Mock };
  let store: FileJobArtifactStore;
  let processor: VideoToSummaryJobProcessor;
  let job: Job;

  /** Roda o job e, se falhar, prepara a retomada do mesmo job, como o launcher faz. */
  const run = async () => {
    job.start();

    try {
      await processor.process(job, dto);
      job.complete();
    } catch (error) {
      job.fail((error as Error).message);
      job.resetForRetry();
    }
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-'));
    store = new FileJobArtifactStore(dir);

    const movie = path.join(dir, 'v.mp4');
    const audio = path.join(dir, 'a.wav');

    video = {
      download: jest.fn().mockImplementation(async () => {
        fs.writeFileSync(movie, 'v');

        return movie;
      }),
      toAudio: jest.fn().mockImplementation(async () => {
        fs.writeFileSync(audio, 'a');

        return audio;
      }),
      deleteVideo: jest.fn().mockImplementation(async () => fs.rmSync(movie, { force: true })),
      summarize: jest.fn().mockResolvedValue('# resumo'),
      saveFile: jest.fn().mockResolvedValue('/out.md'),
      deleteAudio: jest.fn().mockImplementation(async () => fs.rmSync(audio, { force: true })),
    };
    whisper = { transcribe: jest.fn().mockResolvedValue('fala') };
    processor = new VideoToSummaryJobProcessor(
      video as unknown as VideoService,
      whisper as unknown as WhisperService,
      undefined,
      store,
    );
    job = new Job('video-to-summary', {}, dto);
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when the summary fails, should keep the transcript and not repeat earlier steps on retry', async () => {
    video.summarize.mockRejectedValueOnce(new Error('limite de uso'));

    await run();

    expect(job.steps.find((step) => step.name === 'transcribe')?.status).toBe(JobStatus.COMPLETED);
    expect(await store.load(job.id)).toMatchObject({ transcript: 'fala' });

    await run();

    expect(video.download).toHaveBeenCalledTimes(1);
    expect(video.toAudio).toHaveBeenCalledTimes(1);
    expect(whisper.transcribe).toHaveBeenCalledTimes(1);
    expect(video.summarize).toHaveBeenCalledTimes(2);
    expect(job.status).toBe(JobStatus.COMPLETED);
    expect(job.steps.every((step) => step.status === JobStatus.COMPLETED)).toBe(true);
  });

  it('when the transcription fails, should reuse the extracted audio instead of downloading again', async () => {
    whisper.transcribe.mockRejectedValueOnce(new Error('falhou'));

    await run();
    await run();

    expect(video.download).toHaveBeenCalledTimes(1);
    expect(video.toAudio).toHaveBeenCalledTimes(1);
    expect(video.deleteVideo).toHaveBeenCalledTimes(1);
    expect(whisper.transcribe).toHaveBeenCalledTimes(2);
    expect(job.status).toBe(JobStatus.COMPLETED);
  });

  it('when the download fails, should run again from the download', async () => {
    video.download.mockRejectedValueOnce(new Error('sem rede'));

    await run();
    await run();

    expect(video.download).toHaveBeenCalledTimes(2);
    expect(job.status).toBe(JobStatus.COMPLETED);
  });

  it('when the audio file was removed before the retry, should download and convert again', async () => {
    whisper.transcribe.mockRejectedValueOnce(new Error('falhou'));

    await run();
    fs.rmSync(path.join(dir, 'a.wav'), { force: true });
    await run();

    expect(video.download).toHaveBeenCalledTimes(2);
    expect(video.toAudio).toHaveBeenCalledTimes(2);
    expect(job.status).toBe(JobStatus.COMPLETED);
    expect(job.steps.every((step) => step.status === JobStatus.COMPLETED)).toBe(true);
  });

  it('when the summary was ready but saving failed, should not call the AI again', async () => {
    video.saveFile.mockRejectedValueOnce(new Error('disco cheio'));

    await run();
    await run();

    expect(video.summarize).toHaveBeenCalledTimes(1);
    expect(video.saveFile).toHaveBeenCalledTimes(2);
    expect(job.status).toBe(JobStatus.COMPLETED);
  });

  it('when the job completes, should clear the saved state', async () => {
    await run();

    expect(await store.load(job.id)).toEqual({});
  });

  it('when steps start and finish, should notify the observer so the job is persisted', async () => {
    const listener = jest.fn();

    job.observe(listener);
    await run();

    expect(listener.mock.calls.length).toBeGreaterThanOrEqual(job.steps.length * 2);
  });
});

describe('VideoToSummaryJobProcessor: andamento em porcentagem', () => {
  it('when whisper, ffmpeg and the download report progress, should show it on the running step', async () => {
    const seen: Array<[string, unknown]> = [];
    const job = new Job('video-to-summary', {}, dto);
    const video = {
      download: jest.fn().mockImplementation(async (...args: unknown[]) => {
        (args[3] as (percent: number) => void)(40);
        seen.push(['download', job.progress]);

        return '/nao/existe/v.mp4';
      }),
      toAudio: jest.fn().mockImplementation(async (...args: unknown[]) => {
        (args[2] as (percent: number) => void)(75);
        seen.push(['convert', job.progress]);

        return '/nao/existe/a.wav';
      }),
      deleteVideo: jest.fn().mockResolvedValue(undefined),
      summarize: jest.fn().mockResolvedValue('# resumo'),
      saveFile: jest.fn().mockResolvedValue('/out.md'),
      deleteAudio: jest.fn().mockResolvedValue(undefined),
    };
    const whisper = {
      transcribe: jest
        .fn()
        .mockImplementation(async (_audio: string, onProgress: (p: number) => void) => {
          onProgress(10);
          seen.push(['transcribe', job.progress]);

          return 'fala';
        }),
    };
    const processor = new VideoToSummaryJobProcessor(
      video as unknown as VideoService,
      whisper as unknown as WhisperService,
    );

    job.start();
    await processor.process(job, dto);

    expect(seen).toEqual([
      ['download', { done: 40, total: 100, unit: 'percent' }],
      ['convert', { done: 75, total: 100, unit: 'percent' }],
      ['transcribe', { done: 10, total: 100, unit: 'percent' }],
    ]);
    expect(job.progress).toBeUndefined();
  });
});
