import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { IpcChannels } from '#shared/channels';
import { DEFAULT_APPEARANCE } from '#shared/contracts/appearance';
import { DEFAULT_READING } from '#shared/contracts/reading';
import { mockApi, ok } from '#test/api-mock';

import { AppearanceProvider } from '#components/AppearanceProvider';

import { useReadingSides } from './use-reading-sides';

const wrapper = ({ children }: { children: ReactNode }) => (
  <AppearanceProvider>{children}</AppearanceProvider>
);

const withReading = (reading: Partial<typeof DEFAULT_READING>) =>
  mockApi({
    [IpcChannels.appearance.get]: () =>
      ok({ ...DEFAULT_APPEARANCE, reading: { ...DEFAULT_READING, ...reading } }),
  });

describe('useReadingSides', () => {
  it('when the sides are not swapped, should put follow on the left and options on the right', () => {
    withReading({});
    const { result } = renderHook(() => useReadingSides(true), { wrapper });

    expect(result.current.followOrder).toBe('lg:order-1');
    expect(result.current.optionsOrder).toBe('lg:order-3');
    expect(result.current.columns).toBe('lg:grid-cols-[16rem_minmax(0,1fr)_16rem]');
  });

  it('when the sides are swapped, should put options on the left and follow on the right', async () => {
    withReading({ swapSides: true });
    const { result } = renderHook(() => useReadingSides(true), { wrapper });

    await waitFor(() => expect(result.current.swapped).toBe(true));
    expect(result.current.followOrder).toBe('lg:order-3');
    expect(result.current.optionsOrder).toBe('lg:order-1');
  });

  it('when there is no follow column, should keep a single side column for the options on the right', async () => {
    withReading({});
    const { result } = renderHook(() => useReadingSides(false), { wrapper });

    await waitFor(() => expect(result.current.swapped).toBe(false));
    expect(result.current.columns).toBe('lg:grid-cols-[minmax(0,1fr)_16rem]');
  });

  it('when there is no follow column and the sides are swapped, should put the options column on the left', async () => {
    withReading({ swapSides: true });
    const { result } = renderHook(() => useReadingSides(false), { wrapper });

    await waitFor(() => expect(result.current.swapped).toBe(true));
    expect(result.current.columns).toBe('lg:grid-cols-[16rem_minmax(0,1fr)]');
  });
});
