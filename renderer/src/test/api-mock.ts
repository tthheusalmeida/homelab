import { vi } from 'vitest';

import type { RendererApi } from '#shared/renderer-api';

type Handler = (payload: unknown) => unknown;

/** `window.api` falso: cada canal responde com o que o handler devolver (já no formato do envelope). */
export function mockApi(handlers: Record<string, Handler>) {
  const invoke = vi.fn((channel: string, payload?: unknown) => {
    const handler = handlers[channel];

    if (!handler) {
      return Promise.reject(new Error(`sem handler para ${channel}`));
    }

    return Promise.resolve(handler(payload));
  });

  window.api = { invoke } as unknown as RendererApi;

  return invoke;
}

export const ok = <T,>(data: T) => ({ ok: true as const, data });

export const failure = (code: string, message: string) => ({
  ok: false as const,
  error: { code, message },
});

/** Payloads enviados a um canal, na ordem. */
export const payloadsOf = (invoke: ReturnType<typeof mockApi>, channel: string) =>
  invoke.mock.calls.filter(([called]) => called === channel).map(([, payload]) => payload);
