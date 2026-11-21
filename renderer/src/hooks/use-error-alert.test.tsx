import type { ReactNode } from 'react';

import { renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SnackbarProvider } from '#components/Snackbar';

import { useErrorAlert } from './use-error-alert';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SnackbarProvider>{children}</SnackbarProvider>
);

describe('useErrorAlert', () => {
  it('when there is a message, should show it as an error alert', () => {
    renderHook(() => useErrorAlert('Não foi possível salvar.'), { wrapper });

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar.');
  });

  it.each([null, undefined, false, ''] as const)(
    'when the message is %j, should show nothing',
    (message) => {
      renderHook(() => useErrorAlert(message), { wrapper });

      expect(screen.queryByRole('alert')).toBeNull();
    },
  );

  it('when the message changes, should show the new one', () => {
    const { rerender } = renderHook(({ message }) => useErrorAlert(message), {
      wrapper,
      initialProps: { message: 'Primeiro erro' as string | null },
    });

    rerender({ message: 'Segundo erro' });

    expect(screen.getByRole('alert')).toHaveTextContent('Segundo erro');
  });

  it('when the error clears and happens again, should show it again', () => {
    const { rerender } = renderHook(({ message }) => useErrorAlert(message), {
      wrapper,
      initialProps: { message: 'Falhou' as string | null },
    });

    rerender({ message: null });
    rerender({ message: 'Falhou' });

    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });

  it('when rendered without a provider, should not break', () => {
    expect(() => renderHook(() => useErrorAlert('Falhou'))).not.toThrow();
  });
});

describe('useErrorAlert with an action', () => {
  it('when an action is given, should offer it as a button in the alert', () => {
    let retried = 0;

    renderHook(() => useErrorAlert('Falhou', { label: 'Tentar de novo', onClick: () => (retried += 1) }), {
      wrapper,
    });

    screen.getByRole('button', { name: 'Tentar de novo' }).click();

    expect(retried).toBe(1);
  });

  it('when only the action changes, should not raise the alert again', () => {
    const { rerender } = renderHook(
      ({ onClick }) => useErrorAlert('Falhou', { label: 'Tentar de novo', onClick }),
      { wrapper, initialProps: { onClick: () => undefined } },
    );
    const first = screen.getByRole('alert');

    rerender({ onClick: () => undefined });

    expect(screen.getByRole('alert')).toBe(first);
  });
});
