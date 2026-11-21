import { JobStatus } from './domain/job-status.enum';

import { VideoToTranscriptPipeline } from './processors/video-to-transcript/steps';
import { VideoToResumePipeline } from './processors/video-to-resume/steps';
import { PdfToSummaryPipeline } from './processors/pdf-to-summary/steps';

export const JobTypeOptions = {
  VIDEO_TO_TRANSCRIPT: 'video-to-transcript',
  VIDEO_TO_SUMMARY: 'video-to-summary',
  PDF_TO_SUMMARY: 'pdf-to-summary',
} as const;

export interface JobStep {
  name: string;
  label: string;
  status: JobStatus;
}

export type JobType = (typeof JobTypeOptions)[keyof typeof JobTypeOptions];

interface JobTypeData {
  type: JobType;
  label: string;
  description: string;
  steps: Array<Pick<JobStep, 'name' | 'label'>>;
}

export const JobTypeConfig: Record<JobType, JobTypeData> = {
  [JobTypeOptions.VIDEO_TO_TRANSCRIPT]: {
    type: JobTypeOptions.VIDEO_TO_TRANSCRIPT,
    label: 'Transcrição de vídeo',
    description:
      'Baixa o vídeo, extrai o áudio, transcreve o conteúdo e salva o resultado em arquivo de texto.',
    steps: VideoToTranscriptPipeline,
  },

  [JobTypeOptions.VIDEO_TO_SUMMARY]: {
    type: JobTypeOptions.VIDEO_TO_SUMMARY,
    label: 'Resumo de vídeo',
    description:
      'Baixa o vídeo, extrai o áudio, transcreve, resume o conteúdo e salva o resultado em arquivo markdown.',
    steps: VideoToResumePipeline,
  },

  [JobTypeOptions.PDF_TO_SUMMARY]: {
    type: JobTypeOptions.PDF_TO_SUMMARY,
    label: 'Resumo de PDF',
    description:
      'Lê o texto do PDF, resume cada parte (guardando o progresso em disco para poder continuar) e salva o resultado em arquivo markdown.',
    steps: PdfToSummaryPipeline,
  },
};
