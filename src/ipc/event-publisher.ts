import { allEvents, type IpcEvent, type IpcEventPayload } from '../shared/events';

/** Envia eventos do main para o renderer (sentido contrário ao `invoke`). */
export interface EventPublisher {
  publish<E extends IpcEvent>(event: E, payload: IpcEventPayload<E>): void;
}

/** Parte mínima de uma janela do Electron usada para enviar eventos. */
export interface WindowLike {
  isDestroyed(): boolean;
  webContents: { send(channel: string, payload: unknown): void };
}

export const EventMessages = {
  notDeclared: 'Evento IPC não declarado em IpcEvents',
} as const;

/**
 * Publica o evento em **todas as janelas abertas** (app e Configurações). Janela já fechada é
 * ignorada, e uma janela com falha não impede as outras de receber. Evento fora de `IpcEvents` é erro
 * de programação e falha na hora.
 */
export class WindowEventPublisher implements EventPublisher {
  private readonly declared = new Set<string>(allEvents());

  constructor(private readonly windows: () => WindowLike[]) {}

  publish<E extends IpcEvent>(event: E, payload: IpcEventPayload<E>): void {
    if (!this.declared.has(event)) {
      throw new Error(`${EventMessages.notDeclared}: ${event}`);
    }

    for (const window of this.windows()) {
      if (window.isDestroyed()) {
        continue;
      }

      try {
        window.webContents.send(event, payload);
      } catch {
        // a janela pode ter sido destruída entre a checagem e o envio
      }
    }
  }
}
