import type { ReactElement, ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';

import { createTestQueryClient } from '#test/utils';

import { SnackbarProvider } from './components/Snackbar';

export { failure, mockApi, ok, payloadsOf } from '#test/api-mock';

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
