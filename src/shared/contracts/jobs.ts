import type { AiProviderId } from './ai';

export const JobTypeIds = {
  VIDEO_TO_TRANSCRIPT: 'video-to-transcript',
  VIDEO_TO_SUMMARY: 'video-to-summary',
} as const;

export type JobTypeId = (typeof JobTypeIds)[keyof typeof JobTypeIds];

export type JobStatusId = 'pending' | 'running' | 'completed' | 'failed';

export interface JobStepView {
  name: string;
  label: string;
  status: JobStatusId;
}

/** Job como o `GET jobs` devolvia (datas em texto ISO, já sem os getters da entidade). */
export interface JobView {
  id: string;
  name: JobTypeId;
  label: string;
  status: JobStatusId;
  steps: JobStepView[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  /** O cancelamento foi pedido: o job para ao terminar a etapa em andamento. */
  cancelRequested?: boolean;
  /** Falhou e guarda os dados de criação: dá para tentar de novo. */
  retryable?: boolean;
  /** Aviso da etapa em andamento, ex.: "Tentando de novo (2 de 3): serviço sobrecarregado". */
  note?: string;
  /** Falhou porque o vídeo exige login: a tela oferece "Entrar no site" e depois tenta de novo. */
  errorCode?: 'ACCESS_REQUIRED';
  /** Endereço do vídeo que pediu login (junto com `errorCode`). */
  accessUrl?: string;
}

/** Resultado de `jobs:grant-access`: `granted` é falso se a janela de login foi fechada sem entrar. */
export interface JobAccessResult {
  id: string;
  granted: boolean;
}

/** Tipo de job (resposta de `jobs:types`). */
export interface JobTypeView {
  type: JobTypeId;
  label: string;
  description: string;
  steps: { name: string; label: string }[];
}

export interface JobRequest {
  id: string;
}

/** Título, categoria e tags opcionais do documento gerado (validados antes de enfileirar). */
export interface JobHints {
  title?: string;
  /** Lista de níveis, do mais amplo ao mais específico (1 a 4). */
  category?: string[];
  tags?: string[];
}

export interface CreateVideoToTranscriptRequest extends JobHints {
  url: string;
}

/** Nível de detalhe do resumo; valor desconhecido vale `detailed` (regra do back). */
export type SummaryDetailId = 'brief' | 'detailed' | 'study';

export interface CreateVideoToSummaryRequest extends JobHints {
  url: string;
  providerId: AiProviderId;
  modelId: string;
  thinking?: string;
  detail?: SummaryDetailId;
}

/** Resposta de criação: o job entra na fila e o acompanhamento é por `jobs:list`/`jobs:get`. */
export interface JobCreated {
  id: string;
  status: JobStatusId;
}

/**
 * Resultado de cancelar: `cancelled` (estava na fila e saiu dela), `cancelling` (rodando: para ao
 * fim da etapa em andamento) ou `not-active` (já tinha terminado).
 */
export interface JobCancelResult {
  id: string;
  outcome: 'cancelled' | 'cancelling' | 'not-active';
}

/** Jobs que voltaram ao histórico ao desfazer a última exclusão. */
export interface JobUndoDeleteResult {
  restored: string[];
}

export interface JobDeleteRequest {
  ids: string[];
}

/** Por que um job não foi excluído: ainda está na fila ou rodando, ou não existe mais. */
export type JobSkipReason = 'ACTIVE' | 'NOT_FOUND';

export interface JobDeleteResult {
  deleted: string[];
  skipped: { id: string; reason: JobSkipReason }[];
}
