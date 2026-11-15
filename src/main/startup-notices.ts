import type { AppNotice } from '../shared/contracts/events';

import { JOBS_ROUTE } from './event-back-alerts';

/** O que o main sabe, na abertura, sobre os arquivos de estado (jobs, conversas, configurações). */
export interface StartupReports {
  jobs: { interrupted: string[]; recoveredFromBackup: boolean; unreadable: boolean };
  chats: { recoveredFromBackup: boolean; unreadable: boolean };
  settingsRecoveredFromBackup: boolean;
}

export const StartupMessages = {
  interrupted: (count: number) =>
    count === 1
      ? '1 processo foi interrompido ao fechar o app'
      : `${count} processos foram interrompidos ao fechar o app`,
  interruptedHelp:
    'Eles aparecem como falhos na lista de tarefas. Crie o processo de novo se precisar.',
  jobsLink: 'Ver tarefas',
  recovered: (what: string) =>
    `${what.charAt(0).toUpperCase()}${what.slice(1)} estava corrompido: usei a última cópia boa`,
  recoveredHelp:
    'Pode faltar o que foi feito por último. O arquivo com problema foi guardado ao lado, com a extensão .corrupt.',
  unreadable: (what: string) => `Não foi possível ler ${what}: começou vazio`,
  unreadableHelp:
    'O arquivo com problema foi guardado ao lado, com a extensão .corrupt, caso queira recuperá-lo.',
} as const;

const WHAT = {
  jobs: 'o histórico de processos',
  chats: 'as conversas',
  settings: 'o arquivo de configurações',
} as const;

/** Avisos a mostrar quando o app abre: processos interrompidos e arquivos recuperados da cópia ou ilegíveis. */
export function buildStartupNotices(reports: StartupReports): AppNotice[] {
  const notices: AppNotice[] = [];

  if (reports.jobs.interrupted.length > 0) {
    notices.push({
      id: 'startup:jobs-interrupted',
      level: 'warning',
      title: StartupMessages.interrupted(reports.jobs.interrupted.length),
      message: StartupMessages.interruptedHelp,
      link: { label: StartupMessages.jobsLink, path: JOBS_ROUTE },
    });
  }

  const states: Array<[keyof typeof WHAT, boolean, boolean]> = [
    ['jobs', reports.jobs.recoveredFromBackup, reports.jobs.unreadable],
    ['chats', reports.chats.recoveredFromBackup, reports.chats.unreadable],
    ['settings', reports.settingsRecoveredFromBackup, false],
  ];

  for (const [key, recovered, unreadable] of states) {
    if (unreadable) {
      notices.push({
        id: `startup:${key}-unreadable`,
        level: 'error',
        title: StartupMessages.unreadable(WHAT[key]),
        message: StartupMessages.unreadableHelp,
      });
    } else if (recovered) {
      notices.push({
        id: `startup:${key}-recovered`,
        level: 'warning',
        title: StartupMessages.recovered(WHAT[key]),
        message: StartupMessages.recoveredHelp,
      });
    }
  }

  return notices;
}
