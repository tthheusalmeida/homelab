import { describe, expect, it, vi } from "vitest";
import { act, render } from "@testing-library/react";

import { IpcEvents } from "#shared/events";
import { emitEvent, listenerCount, mockApi } from "#test/api-mock";

import { useIpcEvent } from "./use-ipc-event";

function Listener({ onEvent }: { onEvent: (payload: unknown) => void }) {
  useIpcEvent(IpcEvents.backupProgress, onEvent);

  return null;
}

describe("useIpcEvent", () => {
  it("when the main sends the event, should call the handler with its payload", () => {
    mockApi({});
    const onEvent = vi.fn();

    render(<Listener onEvent={onEvent} />);
    act(() => emitEvent(IpcEvents.backupProgress, { processed: 1, total: 3 }));

    expect(onEvent).toHaveBeenCalledWith({ processed: 1, total: 3 });
  });

  it("when another event is sent, should not call the handler", () => {
    mockApi({});
    const onEvent = vi.fn();

    render(<Listener onEvent={onEvent} />);
    act(() => emitEvent(IpcEvents.notice, { id: "x" }));

    expect(onEvent).not.toHaveBeenCalled();
  });

  it("when the handler changes between renders, should call the latest one without subscribing again", () => {
    mockApi({});
    const first = vi.fn();
    const second = vi.fn();

    const { rerender } = render(<Listener onEvent={first} />);
    rerender(<Listener onEvent={second} />);
    act(() => emitEvent(IpcEvents.backupProgress, { processed: 2 }));

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ processed: 2 });
    expect(listenerCount(IpcEvents.backupProgress)).toBe(1);
  });

  it("when the component unmounts, should stop listening", () => {
    mockApi({});
    const onEvent = vi.fn();

    const { unmount } = render(<Listener onEvent={onEvent} />);
    expect(listenerCount(IpcEvents.backupProgress)).toBe(1);

    unmount();
    act(() => emitEvent(IpcEvents.backupProgress, { processed: 3 }));

    expect(listenerCount(IpcEvents.backupProgress)).toBe(0);
    expect(onEvent).not.toHaveBeenCalled();
  });

  it("when there is no preload with events, should do nothing instead of failing", () => {
    window.api = { invoke: vi.fn() } as never;

    expect(() => render(<Listener onEvent={vi.fn()} />)).not.toThrow();
  });
});
