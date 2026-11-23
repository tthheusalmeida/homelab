import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { Job } from '../../domain/job.entity';
import { JobStatus } from '../../domain/job-status.enum';
import { FileJobArtifactStore } from '../../infrastructure/job-artifact.store';
import type { WhisperService } from '../../../ai/whisper/whisper.service';
import type { VideoService } from '../../../video/video.service';

import { VideoToTranscriptJobProcessor } from './processor';

describe('VideoToTranscriptJobProcessor: retomada', () => {
  let dir: string;
  let video: Record<'download' | 'toAudio' | 'deleteVideo' | 'saveFile' | 'deleteAudio', jest.Mock>;
  let whisper: { transcribeSegments: jest.Mock };
  let store: FileJobArtifactStore;
  let processor: VideoToTranscriptJobProcessor;
  let job: Job;

  const run = async () => {
    job.start();

    try {
      await processor.process(job, 'http://x/v.mp4');
      job.complete();
    } catch (error) {
      job.fail((error as Error).message);
      job.resetForRetry();
    }
  };

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-t-'));
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
      saveFile: jest.fn().mockResolvedValue('/out.md'),
      deleteAudio: jest.fn().mockImplementation(async () => fs.rmSync(audio, { force: true })),
    };
    whisper = {
      transcribeSegments: jest.fn().mockResolvedValue([{ start: 0, end: 1, text: 'oi' }]),
    };
    processor = new VideoToTranscriptJobProcessor(
      video as unknown as VideoService,
      whisper as unknown as WhisperService,
      store,
    );
    job = new Job('video-to-transcript', {}, 'http://x/v.mp4');
  });

  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  it('when the transcription fails, should resume from it with the audio already extracted', async () => {
    whisper.transcribeSegments.mockRejectedValueOnce(new Error('falhou'));

    await run();

    expect(job.status).toBe(JobStatus.PENDING);
    expect(job.steps.slice(0, 3).every((step) => step.status === JobStatus.COMPLETED)).toBe(true);

    await run();

    expect(video.download).toHaveBeenCalledTimes(1);
    expect(video.toAudio).toHaveBeenCalledTimes(1);
    expect(whisper.transcribeSegments).toHaveBeenCalledTimes(2);
    expect(job.status).toBe(JobStatus.COMPLETED);
  });

  it('when saving fails after transcribing, should not transcribe again', async () => {
    video.saveFile.mockRejectedValueOnce(new Error('disco cheio'));

    await run();
    await run();

    expect(whisper.transcribeSegments).toHaveBeenCalledTimes(1);
    expect(video.saveFile).toHaveBeenCalledTimes(2);
    expect(job.status).toBe(JobStatus.COMPLETED);
  });

  it('when the audio is already gone on retry, should finish the last step without failing', async () => {
    video.saveFile.mockRejectedValueOnce(new Error('disco cheio'));

    await run();
    fs.rmSync(path.join(dir, 'a.wav'), { force: true });
    await run();

    expect(video.deleteAudio).not.toHaveBeenCalled();
    expect(job.status).toBe(JobStatus.COMPLETED);
  });
});
