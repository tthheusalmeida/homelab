import { IpcChannels } from '../../shared/channels';
import type { AppNotice } from '../../shared/contracts/events';
import { IpcHandler, type IpcRoute } from '../ipc-handler';

/** Porta do buffer de avisos de abertura. */
export interface PendingNotices {
  drain(): AppNotice[];
}

/** Canal `notices:pending`: a tela busca os avisos que nasceram antes de ela existir. */
export class NoticeHandler extends IpcHandler {
  constructor(private readonly notices: PendingNotices) {
    super();
  }

  routes(): IpcRoute[] {
    return [this.route(IpcChannels.notices.pending, () => this.notices.drain())];
  }
}
