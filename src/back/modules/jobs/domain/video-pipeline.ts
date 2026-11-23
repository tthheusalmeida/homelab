import * as fs from 'node:fs';

import type { VideoService } from '../../video/video.service';
import type { JobArtifactStore } from '../infrastructure/job-artifact.store';
import type { Job } from './job.entity';

/** Nomes das etapas iniciais, iguais nos dois pipelines de vídeo. */
export interface AudioSteps {
  download: string;
  convert: string;
  deleteVideo: string;
}

const exists = (file: string | undefined): file is string =>
  file !== undefined && fs.existsSync(file);

/**
 * Deixa o áudio do job pronto, refazendo só o que falta: o áudio já extraído (de uma execução
 * anterior que parou) é reaproveitado; senão o vídeo já baixado é convertido; senão baixa de novo.
 * O que fica pronto é anotado em disco logo depois de cada etapa.
 */
export async function ensureAudio(
  job: Job,
  store: JobArtifactStore,
  videos: Pick<VideoService, 'download' | 'toAudio' | 'deleteVideo'>,
  steps: AudioSteps,
  url: string,
): Promise<{ audioPath: string; resumed: boolean }> {
  const saved = await store.load(job.id);

  if (exists(saved.audioPath)) {
    job.skipStep(steps.download);
    job.skipStep(steps.convert);

    // vídeo que sobrou de uma execução anterior: só remove se ainda existir
    if (exists(saved.videoPath)) {
      await removeVideoStep(job, store, videos, steps, saved.videoPath);
    } else {
      job.skipStep(steps.deleteVideo);
    }

    return { audioPath: saved.audioPath, resumed: true };
  }

  let videoPath = exists(saved.videoPath) ? saved.videoPath : undefined;

  if (videoPath) {
    job.skipStep(steps.download);
  } else {
    job.resetStepsFrom(steps.download);
    videoPath = await job.runStep(steps.download, () =>
      videos.download(
        url,
        `${job.id}.mp4`,
        undefined,
        (percent) => job.setPercent(percent),
        job.signal,
      ),
    );
    await store.save(job.id, { videoPath });
  }

  const audioPath = await job.runStep(steps.convert, () =>
    videos.toAudio(videoPath, undefined, (percent) => job.setPercent(percent), job.signal),
  );

  await store.save(job.id, { audioPath });
  await removeVideoStep(job, store, videos, steps, videoPath);

  return { audioPath, resumed: false };
}

async function removeVideoStep(
  job: Job,
  store: JobArtifactStore,
  videos: Pick<VideoService, 'deleteVideo'>,
  steps: AudioSteps,
  videoPath: string,
): Promise<void> {
  if (job.isStepCompleted(steps.deleteVideo)) {
    return;
  }

  await job.runStep(steps.deleteVideo, () => videos.deleteVideo(videoPath));

  await store.save(job.id, { videoPath: undefined });
}

/** Marca como prontas as etapas anteriores à transcrição quando o texto já está em disco. */
export function skipToTranscript(job: Job, steps: AudioSteps & { transcribe: string }): void {
  [steps.download, steps.convert, steps.deleteVideo, steps.transcribe].forEach((name) =>
    job.skipStep(name),
  );
}

/**
 * Remove o áudio temporário. O áudio de uma execução anterior pode já ter sido apagado (limpeza
 * manual dos temporários): nesse caso a etapa só fica concluída.
 */
export async function removeAudioStep(
  job: Job,
  videos: Pick<VideoService, 'deleteAudio'>,
  step: string,
  audioPath: string,
  resumed: boolean,
): Promise<void> {
  if (resumed && !exists(audioPath)) {
    job.skipStep(step);

    return;
  }

  await job.runStep(step, () => videos.deleteAudio(audioPath));
}
