export const JobStatusOptions: Record<string, string> = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export const JobNameOptions = {
  VIDEO_TO_TRANSCRIPT: "video-to-transcript",
  VIDEO_TO_SUMMARY: "video-to-summary",
  PDF_TO_SUMMARY: "pdf-to-summary",
} as const;

export type JobStatus =
  (typeof JobStatusOptions)[keyof typeof JobStatusOptions];


export interface JobStepType {
  name: string;
  label: string;
  status: JobStatus;
}

export interface Job {
  completedAt: string;
  createdAt: string;
  id: string;
  name: string;
  label: string;
  startedAt?: string;
  status: JobStatus;
  error?: string;
  /** O cancelamento foi pedido: o job para ao fim da etapa em andamento. */
  cancelRequested?: boolean;
  /** Falhou e guarda os dados de criação: dá para tentar de novo. */
  retryable?: boolean;
  /** Aviso da etapa em andamento, ex.: "Tentando de novo (tentativa 2 de 3): ...". */
  note?: string;
  /** Andamento dentro da etapa em execução (ex.: parte 2 de 5). */
  progress?: { done: number; total: number };
  /** Falhou porque o vídeo exige login: a tela oferece "Entrar no site" e tenta de novo. */
  errorCode?: "ACCESS_REQUIRED";
  /** Endereço do vídeo que pediu login. */
  accessUrl?: string;
  /** Resumo de PDF que falhou ou foi interrompido: quantas partes já estão prontas em disco. */
  resume?: { done: number; total: number };
  steps: JobStepType[];
}

export interface JobType {
  type: string;
  label: string;
  description: string;
}
