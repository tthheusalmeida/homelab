import type { ComponentsStatus } from './contracts/components';
import type { UpdateStatus } from './contracts/updates';
import type { AppNotice, ProgressEventPayload } from './contracts/events';

/**
 * Eventos enviados pelo main ao renderer (sentido contrário ao `invoke`). Formato
 * `<domínio>:<assunto>`. O preload só entrega ao front os eventos desta lista.
 */
export const IpcEvents = {
  backupProgress: 'backup:progress',
  libraryMoveProgress: 'library-move:progress',
  notice: 'app:notice',
  componentsProgress: 'components:progress',
  settingsNavigate: 'settings:navigate',
  updatesChanged: 'updates:changed',
  restartPending: 'app:restart-needed',
} as const;

export type IpcEvent = (typeof IpcEvents)[keyof typeof IpcEvents];

/** Payload de cada evento. */
export interface IpcEventPayloads {
  [IpcEvents.backupProgress]: ProgressEventPayload;
  [IpcEvents.libraryMoveProgress]: ProgressEventPayload;
  [IpcEvents.notice]: AppNotice;
  [IpcEvents.componentsProgress]: ComponentsStatus;
  /** O estado da atualização mudou (nova versão, progresso do download, erro). */
  [IpcEvents.updatesChanged]: UpdateStatus;
  /** Abre as Configurações (rota do app), numa seção quando informada. */
  [IpcEvents.settingsNavigate]: { section?: string };
  /** Há alteração que só vale depois de reiniciar (sempre `true`: o estado zera ao reiniciar). */
  [IpcEvents.restartPending]: boolean;
}

export type IpcEventPayload<E extends IpcEvent> = IpcEventPayloads[E];

/** Lista plana dos eventos declarados (base da lista permitida no preload). */
export function allEvents(): IpcEvent[] {
  return Object.values(IpcEvents);
}

export const EVENT_FORMAT = /^[a-z]+(-[a-z]+)*(:[a-z]+(-[a-z]+)*)+$/;
