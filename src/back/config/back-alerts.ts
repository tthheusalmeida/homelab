/** Job que terminou (com sucesso ou falha): o usuário pode estar em outra tela e precisa saber. */
export interface FinishedJob {
  id: string;
  label: string;
  status: 'completed' | 'failed';
  error?: string;
}

/**
 * Avisos que o back precisa dar ao usuário sem conhecer o Electron (ex.: falha ao gravar o histórico
 * em disco, job que terminou). O desktop liga isto ao evento `app:notice`; nos testes basta o
 * `NoopBackAlerts`.
 */
export abstract class BackAlerts {
  /** Não foi possível gravar algo em disco (disco cheio, arquivo em uso, permissão). */
  abstract persistFailed(what: string, reason: string): void;

  /** Um job terminou. */
  abstract jobFinished(job: FinishedJob): void;
}

export class NoopBackAlerts extends BackAlerts {
  persistFailed(): void {
    // sem ninguém a avisar
  }

  jobFinished(): void {
    // sem ninguém a avisar
  }
}
