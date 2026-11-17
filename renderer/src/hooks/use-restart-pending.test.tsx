import type { ReactNode } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { createTestQueryClient } from '#test/utils';
import { emitEvent, failure, mockApi, ok, payloadsOf } from '#test/api-mock';

import { useMarkRestartPending, useRestartPending } from './use-restart-pending';

/** Um cliente por teste (o mesmo em todos os renders, senão o cache é descartado). */
function makeWrapper() {
  const client = createTestQueryClient();

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useRestartPending', () => {
  it('when the main says there is nothing pending, should be false', async () => {
    const invoke = mockApi({ [IpcChannels.app.restartPending]: () => ok(false) });

    const { result } = renderHook(() => useRestartPending(), { wrapper: makeWrapper() });

    await waitFor(() => expect(invoke).toHaveBeenCalledWith(IpcChannels.app.restartPending));
    expect(result.current).toBe(false);
  });

  it('when the main says a restart is pending (e.g. the window was reopened), should be true', async () => {
    mockApi({ [IpcChannels.app.restartPending]: () => ok(true) });

    const { result } = renderHook(() => useRestartPending(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('when the main announces it later, should turn true without asking again', async () => {
    mockApi({ [IpcChannels.app.restartPending]: () => ok(false) });
    const { result } = renderHook(() => useRestartPending(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current).toBe(false));

    act(() => emitEvent(IpcEvents.restartPending, true));

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('when the query fails, should stay false', async () => {
    mockApi({ [IpcChannels.app.restartPending]: () => failure('INTERNAL', 'falhou') });

    const { result } = renderHook(() => useRestartPending(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current).toBe(false));
  });
});

describe('useMarkRestartPending', () => {
  it('when marked, should show the notice right away and tell the main', async () => {
    const invoke = mockApi({
      [IpcChannels.app.restartPending]: () => ok(false),
      [IpcChannels.app.markRestartPending]: () => ok(undefined),
    });
    const { result } = renderHook(
      () => ({ pending: useRestartPending(), mark: useMarkRestartPending() }),
      {
        wrapper: makeWrapper(),
      },
    );
    await waitFor(() => expect(invoke).toHaveBeenCalledWith(IpcChannels.app.restartPending));

    act(() => result.current.mark());

    await waitFor(() => expect(result.current.pending).toBe(true));
    expect(payloadsOf(invoke, IpcChannels.app.markRestartPending)).toHaveLength(1);
  });

  it('when telling the main fails, should still keep the notice on the screen', async () => {
    mockApi({
      [IpcChannels.app.restartPending]: () => ok(false),
      [IpcChannels.app.markRestartPending]: () => failure('INTERNAL', 'falhou'),
    });
    const { result } = renderHook(
      () => ({ pending: useRestartPending(), mark: useMarkRestartPending() }),
      {
        wrapper: makeWrapper(),
      },
    );

    await act(async () => undefined);
    act(() => result.current.mark());

    await waitFor(() => expect(result.current.pending).toBe(true));
  });

  it('when marked while the first query is still in flight, should not lose the notice when the old answer arrives', async () => {
    let answer: (value: unknown) => void = () => undefined;
    mockApi({
      [IpcChannels.app.restartPending]: () =>
        new Promise((resolve) => {
          answer = resolve;
        }),
      [IpcChannels.app.markRestartPending]: () => ok(undefined),
    });
    const { result } = renderHook(
      () => ({ pending: useRestartPending(), mark: useMarkRestartPending() }),
      {
        wrapper: makeWrapper(),
      },
    );

    act(() => result.current.mark());
    await act(async () => {
      answer(ok(false));
    });

    await waitFor(() => expect(result.current.pending).toBe(true));
  });
});
