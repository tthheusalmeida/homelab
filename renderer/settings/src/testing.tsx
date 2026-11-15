import type { ReactElement, ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { vi } from 'vitest';

import { createTestQueryClient } from '@front/test/utils';

import type { RendererApi } from '../../../src/shared/renderer-api';

import { SnackbarProvider } from './components/Snackbar';

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

/** Renderiza com o que a janela de Configurações precisa: TanStack Query e o snackbar. */
export function renderWithProviders(ui: ReactElement) {
  const client = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SnackbarProvider>{children}</SnackbarProvider>
      </QueryClientProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

/** Abre um card recolhível pelo título (o nome do botão começa com o título). */
export async function openCard(user: UserEvent, title: string) {
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${title}`) }));
}
