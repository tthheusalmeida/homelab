import type { JobAccessResult, JobView } from '../shared/contracts/jobs';
import { IpcError, IpcErrorCode } from '../shared/errors';

export const JobAccessMessages = {
  notWaiting: 'Este job não está esperando acesso a um site.',
} as const;

/** Janela de login do site: abre, espera o usuário fechar e diz se há acesso guardado. */
export interface PlatformLogin {
  openLogin(url: string): Promise<boolean>;
}

/**
 * Libera o acesso de um vídeo que pediu login: abre a janela de login do site do vídeo e, quando o
 * usuário a fecha, informa se o acesso ficou guardado. Quem chama (a tela) tenta o job de novo.
 */
export class JobAccess {
  constructor(
    private readonly jobs: { get(id: string): Pick<JobView, 'accessUrl'> },
    private readonly login: PlatformLogin,
  ) {}

  async grantAccess(id: string): Promise<JobAccessResult> {
    const { accessUrl } = this.jobs.get(id);

    if (!accessUrl) {
      throw new IpcError(IpcErrorCode.VALIDATION, JobAccessMessages.notWaiting);
    }

    return { id, granted: await this.login.openLogin(accessUrl) };
  }
}
