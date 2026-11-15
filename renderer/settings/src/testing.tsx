import type { ReactElement, ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

import { createTestQueryClient } from '#test/utils';

import { SnackbarProvider } from '#components/Snackbar';

export { emitEvent, failure, mockApi, ok, payloadsOf } from '#test/api-mock';

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

/** Clica no título do card recolhível: abre se estava fechado e fecha se estava aberto. */
export async function toggleCard(user: UserEvent, title: string) {
  await user.click(await screen.findByRole('button', { name: new RegExp(`^${title}`) }));
}

/** Abre um card recolhível pelo título (o nome do botão começa com o título); se já estiver aberto, não faz nada. */
export async function openCard(user: UserEvent, title: string) {
  const trigger = await screen.findByRole('button', { name: new RegExp(`^${title}`) });

  if (trigger.getAttribute('aria-expanded') !== 'true') {
    await user.click(trigger);
  }
}
