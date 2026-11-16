/** O que o desktop precisa para mostrar uma notificação do sistema operacional. */
export interface SystemNotifierDeps {
  /** O app está em primeiro plano (alguma janela dele com foco)? Se sim, o aviso na tela basta. */
  isAppFocused: () => boolean;
  /** O sistema suporta notificações? */
  isSupported: () => boolean;
  /** Mostra a notificação; `onClick` traz o app de volta. */
  show: (notification: { title: string; body: string }, onClick: () => void) => void;
  /** Traz a janela principal para a frente (clique na notificação). */
  focusApp: () => void;
}

export interface SystemNotification {
  title: string;
  body: string;
}

/**
 * Notificação do sistema para quando o usuário não está olhando o app (minimizado ou em outra
 * janela): um job longo terminou e ele precisa saber. Com o app em foco não notifica, porque o
 * aviso na própria tela já aparece. Falha ao notificar nunca atrapalha o app.
 */
export class SystemNotifier {
  constructor(private readonly deps: SystemNotifierDeps) {}

  notify(notification: SystemNotification): boolean {
    try {
      if (this.deps.isAppFocused() || !this.deps.isSupported()) {
        return false;
      }

      this.deps.show(notification, () => this.deps.focusApp());

      return true;
    } catch {
      return false;
    }
  }
}
