import type { ReactElement, ReactNode } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";

import { SnackbarProvider } from "#components/Snackbar";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
}

export function createWrapper() {
  const client = createTestQueryClient();

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <SnackbarProvider>{children}</SnackbarProvider>
      </QueryClientProvider>
    );
  };
}

export function renderWithQuery(ui: ReactElement) {
  return render(ui, { wrapper: createWrapper() });
}

/**
 * `render` com o `SnackbarProvider`: todo erro do app aparece como alerta centralizado no rodapé
 * (`useErrorAlert`), então testes de tela ou de diálogo que checam um erro precisam dele.
 */
export function renderWithSnackbar(ui: ReactElement, options?: RenderOptions) {
  const Inner = options?.wrapper;

  function Wrapper({ children }: { children: ReactNode }) {
    return <SnackbarProvider>{Inner ? <Inner>{children}</Inner> : children}</SnackbarProvider>;
  }

  return render(ui, { ...options, wrapper: Wrapper });
}
