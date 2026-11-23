import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { IpcChannels } from '#shared/channels';
import type { AiSelectionState } from '#shared/contracts/ai';
import { mockApi } from '#test/api-mock';
import { createWrapper } from '#test/utils';

import { useAiInUse, useSaveAiDefault, useSwitchSessionAi } from './use-ai-in-use';

const state = (overrides: Partial<AiSelectionState> = {}): AiSelectionState => ({
  configured: null,
  session: null,
  effective: { providerId: 'gemini', modelId: 'gemini-barato', source: 'auto' },
  ...overrides,
});

const ok = (data: unknown) => ({ ok: true, data });

describe('use-ai-in-use', () => {
  it('when the hook mounts, should read the AI in use from the main process', async () => {
    mockApi({ [IpcChannels.ai.selection]: () => ok(state()) });

    const { result } = renderHook(() => useAiInUse(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data?.effective.modelId).toBe('gemini-barato'));
  });

  it('when switching for this session, should send the preference and update the cached state', async () => {
    const switched = state({
      session: { providerId: 'anthropic', modelId: null },
      effective: { providerId: 'anthropic', modelId: 'claude-barato', source: 'session' },
    });
    const invoke = mockApi({
      [IpcChannels.ai.selection]: () => ok(state()),
      [IpcChannels.ai.session]: () => ok(switched),
    });
    const { result } = renderHook(() => ({ read: useAiInUse(), write: useSwitchSessionAi() }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.read.data).toBeDefined());

    await act(async () => {
      await result.current.write.mutateAsync({ providerId: 'anthropic', modelId: null });
    });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.ai.session, {
      preference: { providerId: 'anthropic', modelId: null },
    });
    await waitFor(() => expect(result.current.read.data?.effective.source).toBe('session'));
  });

  it('when going back to the default, should send null', async () => {
    const invoke = mockApi({ [IpcChannels.ai.session]: () => ok(state()) });
    const { result } = renderHook(() => useSwitchSessionAi(), { wrapper: createWrapper() });

    await act(async () => {
      await result.current.mutateAsync(null);
    });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.ai.session, { preference: null });
  });

  it('when saving the default, should send it and read the AI in use again', async () => {
    let configured: AiSelectionState['configured'] = null;
    const invoke = mockApi({
      [IpcChannels.ai.selection]: () => ok(state({ configured })),
      [IpcChannels.ai.defaultUpdate]: (payload) => {
        configured = (payload as { preference: AiSelectionState['configured'] }).preference;

        return ok(configured);
      },
    });
    const { result } = renderHook(() => ({ read: useAiInUse(), write: useSaveAiDefault() }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.read.data).toBeDefined());

    await act(async () => {
      await result.current.write.mutateAsync({ providerId: 'anthropic', modelId: 'claude-x' });
    });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.ai.defaultUpdate, {
      preference: { providerId: 'anthropic', modelId: 'claude-x' },
    });
    await waitFor(() =>
      expect(result.current.read.data?.configured).toEqual({
        providerId: 'anthropic',
        modelId: 'claude-x',
      }),
    );
  });
});
