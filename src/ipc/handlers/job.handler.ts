import { IpcChannels } from '../../shared/channels';
import type {
  CreateVideoToSummaryRequest,
  CreateVideoToTranscriptRequest,
  JobCreated,
  JobTypeView,
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
    ];
  }
}
