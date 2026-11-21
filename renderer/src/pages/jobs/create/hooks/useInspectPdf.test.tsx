import { describe, expect, it } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { IpcChannels } from '#shared/channels';
import { IpcEvents } from '#shared/events';
import { emitEvent, listenerCount, mockApi, ok } from '#test/api-mock';
import { createWrapper } from '#test/utils';

import { useInspectPdf } from './useInspectPdf';

describe('useInspectPdf', () => {
  it('when no reading is happening, should have no progress', () => {
    mockApi({});

    const { result } = renderHook(() => useInspectPdf(), { wrapper: createWrapper() });

    expect(result.current.progress).toBeNull();
  });

  it('when pages are being read, should follow the progress events', () => {
    mockApi({});
    const { result } = renderHook(() => useInspectPdf(), { wrapper: createWrapper() });

    act(() => emitEvent(IpcEvents.pdfProgress, { phase: 'preparing', processed: 0, total: 0 }));
    expect(result.current.progress).toEqual({ done: 0, total: 0 });

    act(() => emitEvent(IpcEvents.pdfProgress, { phase: 'running', processed: 5, total: 50 }));
    expect(result.current.progress).toEqual({ done: 5, total: 50 });
  });

  it('when the reading ends, should clear the progress', () => {
    mockApi({});
    const { result } = renderHook(() => useInspectPdf(), { wrapper: createWrapper() });

    act(() => emitEvent(IpcEvents.pdfProgress, { phase: 'running', processed: 5, total: 50 }));
    act(() => emitEvent(IpcEvents.pdfProgress, { phase: 'done', processed: 50, total: 50 }));

    expect(result.current.progress).toBeNull();
  });

  it('when the reading finishes, should answer the inspection and clear the progress', async () => {
    mockApi({ [IpcChannels.pdf.inspect]: () => ok({ token: 't' }) });
    const { result } = renderHook(() => useInspectPdf(), { wrapper: createWrapper() });

    act(() => emitEvent(IpcEvents.pdfProgress, { phase: 'running', processed: 1, total: 2 }));
    act(() => result.current.mutate());

    await waitFor(() => expect(result.current.data).toEqual({ token: 't' }));
    expect(result.current.progress).toBeNull();
  });

  it('when cancelling, should call the cancel channel', async () => {
    const invoke = mockApi({ [IpcChannels.pdf.cancel]: () => ok(undefined) });
    const { result } = renderHook(() => useInspectPdf(), { wrapper: createWrapper() });

    await act(() => result.current.cancel());

    expect(invoke).toHaveBeenCalledWith(IpcChannels.pdf.cancel);
  });

  it('when the screen is closed, should stop listening to the progress', () => {
    mockApi({});
    const { unmount } = renderHook(() => useInspectPdf(), { wrapper: createWrapper() });

    expect(listenerCount(IpcEvents.pdfProgress)).toBe(1);

    unmount();

    expect(listenerCount(IpcEvents.pdfProgress)).toBe(0);
  });
});
