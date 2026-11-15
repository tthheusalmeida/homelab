import type { IpcEvent, IpcEventPayload } from '../../shared/events';
import type { EventPublisher } from '../event-publisher';

/** Publicador falso para testes: guarda o que foi publicado, na ordem. */
export class FakeEventPublisher implements EventPublisher {
  readonly published: Array<{ event: IpcEvent; payload: unknown }> = [];

  publish<E extends IpcEvent>(event: E, payload: IpcEventPayload<E>): void {
    this.published.push({ event, payload });
  }

  /** Payloads publicados de um evento, na ordem. */
  payloadsOf<E extends IpcEvent>(event: E): Array<IpcEventPayload<E>> {
    return this.published
      .filter((entry) => entry.event === event)
      .map((entry) => entry.payload as IpcEventPayload<E>);
  }
}
