import type { AppNotice } from '../shared/contracts/events';

/**
 * Avisos criados enquanto o app abre (antes de existir janela para recebê-los por evento). A tela
 * os busca ao montar (`notices:pending`) e eles saem do buffer: cada um é entregue uma vez só.
 */
export class NoticeStore {
  private notices: AppNotice[] = [];

  /** Guarda o aviso; um id repetido substitui o anterior. */
  add(notice: AppNotice): void {
    this.notices = [...this.notices.filter((item) => item.id !== notice.id), notice];
  }

  /** Entrega tudo o que está guardado e esvazia o buffer. */
  drain(): AppNotice[] {
    const pending = this.notices;

    this.notices = [];

    return pending;
  }
}
