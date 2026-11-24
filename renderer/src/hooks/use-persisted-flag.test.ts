import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { usePersistedFlag } from './use-persisted-flag';

const KEY = 'homelab.teste-flag';

describe('usePersistedFlag', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('when nothing is stored, should start with the initial value', () => {
    expect(renderHook(() => usePersistedFlag(KEY, false)).result.current[0]).toBe(false);
    expect(renderHook(() => usePersistedFlag(KEY, true)).result.current[0]).toBe(true);
  });

  it('when the value is changed, should update and remember it for the next mount', () => {
    const first = renderHook(() => usePersistedFlag(KEY, false));

    act(() => first.result.current[1](true));

    expect(first.result.current[0]).toBe(true);
    expect(renderHook(() => usePersistedFlag(KEY, false)).result.current[0]).toBe(true);
  });

  it('when the value goes back to false, should remember that too', () => {
    window.localStorage.setItem(KEY, '1');
    const hook = renderHook(() => usePersistedFlag(KEY, false));

    act(() => hook.result.current[1](false));

    expect(renderHook(() => usePersistedFlag(KEY, true)).result.current[0]).toBe(false);
  });

  it('when the storage cannot be read or written, should still work for this screen', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    const hook = renderHook(() => usePersistedFlag(KEY, true));

    expect(hook.result.current[0]).toBe(true);

    act(() => hook.result.current[1](false));

    expect(hook.result.current[0]).toBe(false);
  });

  it('when two keys are used, should keep them apart', () => {
    const a = renderHook(() => usePersistedFlag('homelab.a', false));
    act(() => a.result.current[1](true));

    expect(renderHook(() => usePersistedFlag('homelab.b', false)).result.current[0]).toBe(false);
  });
});
