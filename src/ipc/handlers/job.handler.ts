import { IpcChannels } from '../../shared/channels';
import type {
  CreatePdfToSummaryRequest,
  CreateVideoToSummaryRequest,
  CreateVideoToTranscriptRequest,
  JobAccessResult,
  JobCreated,
  JobDeleteRequest,
  JobCancelResult,
  JobDeleteResult,
  JobUndoDeleteResult,
  JobTypeView,
  JobRequest,
  JobRetryRequest,
  JobView,
} from '../../shared/contracts/jobs';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Consulta de jobs (lista, tipos e um job). */
export interface JobCatalogPort {
  list(): JobView[];
  get(id: string): JobView;
  listTypes(): JobTypeView[];
}

/** Criação e enfileiramento de jobs de vídeo. */
export interface JobLauncherPort {
  startVideoToTranscript(request: CreateVideoToTranscriptRequest): JobCreated;
  startVideoToSummary(request: CreateVideoToSummaryRequest): JobCreated;
  startPdfToSummary(request: CreatePdfToSummaryRequest): Promise<JobCreated>;
  /** Retoma o mesmo job que falhou, da etapa que parou. */
  retry(
    id: JobRetryRequest['id'],
    overrides?: Omit<JobRetryRequest, 'id'>,
  ): JobCreated | Promise<JobCreated>;
}

/** Exclusão de jobs do histórico (jobs na fila ou rodando nunca são excluídos). */
export interface JobDeleterPort {
  deleteMany(ids: JobDeleteRequest['ids']): JobDeleteResult;
  deleteAll(): JobDeleteResult;
  /** Traz de volta o que a última exclusão tirou do histórico. */
  undoDelete(): JobUndoDeleteResult;
}

/** Cancelamento de jobs na fila ou rodando. */
export interface JobCancellerPort {
  cancel(id: JobRequest['id']): JobCancelResult;
}

/** Acesso a vídeos que pedem login: abre a janela de login do site e guarda o acesso. */
export interface JobAccessPort {
  grantAccess(id: JobRequest['id']): Promise<JobAccessResult>;
}

/**
 * Canais `jobs:*`. Dica inválida (título, categoria, tags) chega como 400 do Nest (`VALIDATION`)
 * antes de enfileirar e job inexistente como 404 (`NOT_FOUND`), ambos pelo `IpcErrorMapper`.
 * Falha do pipeline (download, ffmpeg, Whisper, IA) não é erro do canal: o job termina `failed`
 * com a mensagem, como hoje.
 */
export class JobHandler extends IpcHandler {
  constructor(
    private readonly catalog: JobCatalogPort,
    private readonly launcher: JobLauncherPort,
    private readonly deleter: JobDeleterPort,
    private readonly canceller: JobCancellerPort,
    private readonly access: JobAccessPort,
  ) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.jobs.list, () => this.catalog.list()),
      this.route(IpcChannels.jobs.types, () => this.catalog.listTypes()),
      this.route(IpcChannels.jobs.get, ({ id }) => this.catalog.get(id)),
      this.route(IpcChannels.jobs.createVideoToTranscript, (request) =>
        this.launcher.startVideoToTranscript(request),
      ),
      this.route(IpcChannels.jobs.createVideoToSummary, (request) =>
        this.launcher.startVideoToSummary(request),
      ),
      this.route(IpcChannels.jobs.createPdfToSummary, (request) =>
        this.launcher.startPdfToSummary(request),
      ),
      this.route(IpcChannels.jobs.delete, ({ ids }) => this.deleter.deleteMany(ids)),
      this.route(IpcChannels.jobs.deleteAll, () => this.deleter.deleteAll()),
      this.route(IpcChannels.jobs.undoDelete, () => this.deleter.undoDelete()),
      this.route(IpcChannels.jobs.cancel, ({ id }) => this.canceller.cancel(id)),
      this.route(IpcChannels.jobs.retry, ({ id, ...overrides }) =>
        this.launcher.retry(id, overrides),
      ),
      this.route(IpcChannels.jobs.grantAccess, ({ id }) => this.access.grantAccess(id)),
    ];
  }
}
