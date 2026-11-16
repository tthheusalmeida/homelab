import { BackAlerts, type FinishedJob } from '../back/config/back-alerts';
import type { EventPublisher } from '../ipc/event-publisher';
import { IpcEvents } from '../shared/events';

import type { SystemNotification } from './system-notifier';

/** Rota do app com a lista de jobs (destino do link dos avisos de job). */
export const JOBS_ROUTE = '/jobs/track';

export const BackAlertMessages = {
  persistTitle: (what: string) => `Não foi possível gravar ${what}`,
  persistHelp:
    'Confira se o disco tem espaço e se a pasta de dados do HomeLab não está protegida. O que já estava aberto continua funcionando, mas pode não ficar salvo.',
  jobFailedTitle: (label: string) => `${label} falhou`,
  jobFailedHelp: 'Abra a lista de tarefas para ver em qual etapa parou.',
  jobDoneTitle: (label: string) => `${label} concluído`,
  jobsLink: 'Ver tarefas',
  /** Texto da notificação do sistema (quando o app não está em foco). */
  systemJobFailedBody: 'Abra o HomeLab para ver em qual etapa parou.',
  systemJobDoneBody: 'Já está disponível no HomeLab.',
} as const;

/** Transforma os avisos do back em `app:notice` para as janelas abertas. */
export class EventBackAlerts extends BackAlerts {
  constructor(
    private readonly events: EventPublisher,
    /** Notificação do sistema; opcional (nos testes e quando o sistema não suporta). */
    private readonly system?: { notify(notification: SystemNotification): unknown },
  ) {
    super();
  }

  persistFailed(what: string, reason: string): void {
    this.events.publish(IpcEvents.notice, {
      // id fixo por assunto: repetir a falha atualiza o aviso em vez de empilhar vários
      id: `persist-failed:${what}`,
      level: 'error',
      title: BackAlertMessages.persistTitle(what),
      message: BackAlertMessages.persistHelp,
      detail: reason,
    });
  }

  jobFinished(job: FinishedJob): void {
    const failed = job.status === 'failed';

    this.events.publish(IpcEvents.notice, {
      id: `job:${job.id}`,
      level: failed ? 'error' : 'info',
      title: failed
        ? BackAlertMessages.jobFailedTitle(job.label)
        : BackAlertMessages.jobDoneTitle(job.label),
      ...(failed ? { message: BackAlertMessages.jobFailedHelp, detail: job.error } : {}),
      link: { label: BackAlertMessages.jobsLink, path: JOBS_ROUTE },
    });

    this.system?.notify({
      title: failed
        ? BackAlertMessages.jobFailedTitle(job.label)
        : BackAlertMessages.jobDoneTitle(job.label),
      body: failed ? BackAlertMessages.systemJobFailedBody : BackAlertMessages.systemJobDoneBody,
    });
  }
}
