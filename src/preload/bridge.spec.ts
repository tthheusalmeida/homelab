import { createBridge, type IpcRendererLike } from './bridge';

type Listener = (event: unknown, payload: unknown) => void;

/** `ipcRenderer` falso: guarda os listeners por canal e deixa o teste disparar eventos do main. */
function fakeIpc() {
  const listeners = new Map<string, Set<Listener>>();
  const ipc: IpcRendererLike = {
    invoke: jest.fn().mockResolvedValue({ ok: true, data: 'pong' }),
    on: jest.fn((channel: string, listener: Listener) => {
      listeners.set(channel, (listeners.get(channel) ?? new Set()).add(listener));
    }),
    removeListener: jest.fn((channel: string, listener: Listener) => {
      listeners.get(channel)?.delete(listener);
    }),
  };
  const emit = (channel: string, payload: unknown) =>
    listeners
      .get(channel)
      ?.forEach((listener) => listener({ sender: 'objeto-do-electron' }, payload));

  return { ipc, emit, count: (channel: string) => listeners.get(channel)?.size ?? 0 };
}

describe('createBridge', () => {
  it('when the channel is allowed, should forward to the renderer ipc and return its result', async () => {
    const { ipc } = fakeIpc();
    const bridge = createBridge(ipc, ['app:ping'], []);

    await expect(bridge.invoke('app:ping', { a: 1 })).resolves.toEqual({
      ok: true,
      data: 'pong',
    });
    expect(ipc.invoke).toHaveBeenCalledWith('app:ping', { a: 1 });
  });

  it('when the channel is not allowed, should reject without reaching the main process', async () => {
    const { ipc } = fakeIpc();
    const bridge = createBridge(ipc, ['app:ping'], []);

    await expect(bridge.invoke('fs:read')).rejects.toThrow(/não permitido: fs:read/);
    expect(ipc.invoke).not.toHaveBeenCalled();
  });

  it('when inspecting the bridge, should expose only invoke and on', () => {
    const bridge = createBridge(fakeIpc().ipc, [], []);

    expect(Object.keys(bridge).sort()).toEqual(['invoke', 'on']);
  });
});

describe('createBridge events', () => {
  it('when listening to an allowed event, should hand over only the payload (never the electron event object)', () => {
    const { ipc, emit } = fakeIpc();
    const listener = jest.fn();

    createBridge(ipc, [], ['backup:progress']).on('backup:progress' as never, listener);
    emit('backup:progress', { processed: 2, total: 5 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ processed: 2, total: 5 });
  });

  it('when the event is not allowed, should throw without listening on the main ipc', () => {
    const { ipc } = fakeIpc();
    const bridge = createBridge(ipc, [], ['backup:progress']);

    expect(() => bridge.on('app:secret' as never, jest.fn())).toThrow(/não permitido: app:secret/);
    expect(ipc.on).not.toHaveBeenCalled();
  });

  it('when the returned function is called, should stop receiving that event', () => {
    const { ipc, emit, count } = fakeIpc();
    const listener = jest.fn();

    const stop = createBridge(ipc, [], ['app:notice']).on('app:notice' as never, listener);
    expect(count('app:notice')).toBe(1);

    stop();
    emit('app:notice', { id: 'x' });

    expect(count('app:notice')).toBe(0);
    expect(listener).not.toHaveBeenCalled();
  });

  it('when two listeners are registered for the same event, should cancel only the one that was stopped', () => {
    const { ipc, emit } = fakeIpc();
    const first = jest.fn();
    const second = jest.fn();
    const bridge = createBridge(ipc, [], ['app:notice']);

    const stopFirst = bridge.on('app:notice' as never, first);
    bridge.on('app:notice' as never, second);
    stopFirst();
    emit('app:notice', { id: 'x' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
