import { IpcChannels } from '../../shared/channels';
import type { JobCleanResult, JobLeftovers } from '../../shared/contracts/jobs';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Arquivos que processos não terminados deixaram no disco. */
export interface JobLeftoversPort {
  scan(): Promise<JobLeftovers>;
  clean(): Promise<JobCleanResult>;
}

/**
 * Canais `jobs:leftovers` e `jobs:clean-leftovers`: medir e apagar o que processos que falharam,
 * foram cancelados ou foram interrompidos deixaram (progresso de PDF, vídeos e áudios temporários).
 * O que um processo na fila ou rodando usa nunca é apagado.
 */
export class JobLeftoversHandler extends IpcHandler {
  constructor(private readonly leftovers: JobLeftoversPort) {
    super();
  }

  routes(): IpcRoute[] {
    return [
      this.route(IpcChannels.jobs.leftovers, () => this.leftovers.scan()),
      this.route(IpcChannels.jobs.cleanLeftovers, () => this.leftovers.clean()),
    ];
  }
}
