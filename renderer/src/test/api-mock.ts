import { vi } from 'vitest';

import type { IpcEvent } from '#shared/events';
import type { RendererApi } from '#shared/renderer-api';

type Handler = (payload: unknown) => unknown;
type EventListener = (payload: unknown) => void;

const eventListeners = new Map<string, Set<EventListener>>();

/** `window.api` falso: cada canal responde com o que o handler devolver (já no formato do envelope). */
export function mockApi(handlers: Record<string, Handler>) {
  eventListeners.clear();

  const invoke = vi.fn((channel: string, payload?: unknown) => {
    const handler = handlers[channel];

    if (!handler) {
      return Promise.reject(new Error(`sem handler para ${channel}`));
    }

    return Promise.resolve(handler(payload));
  });

  const on = vi.fn((event: string, listener: EventListener) => {
    eventListeners.set(event, (eventListeners.get(event) ?? new Set()).add(listener));

    return () => {
      eventListeners.get(event)?.delete(listener);
    };
  });

  window.api = { invoke, on } as unknown as RendererApi;

  return invoke;
}

/** Simula um evento do main para quem está escutando (use dentro de `act` se mexer na tela). */
export function emitEvent(event: IpcEvent, payload: unknown): void {
  eventListeners.get(event)?.forEach((listener) => listener(payload));
}

/** Quantos listeners estão ativos para um evento (para testar a limpeza ao desmontar). */
export const listenerCount = (event: IpcEvent): number => eventListeners.get(event)?.size ?? 0;

export const ok = <T,>(data: T) => ({ ok: true as const, data });

export const failure = (code: string, message: string) => ({
  ok: false as const,
  error: { code, message },
});

/** Payloads enviados a um canal, na ordem. */
export const payloadsOf = (invoke: ReturnType<typeof mockApi>, channel: string) =>
  invoke.mock.calls.filter(([called]) => called === channel).map(([, payload]) => payload);
