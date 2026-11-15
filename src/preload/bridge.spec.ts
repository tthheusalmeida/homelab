import { createBridge } from './bridge';

describe('createBridge', () => {
  it('when the channel is allowed, should forward to the renderer ipc and return its result', async () => {
    const ipc = { invoke: jest.fn().mockResolvedValue({ ok: true, data: 'pong' }) };
    const bridge = createBridge(ipc, ['app:ping']);

    await expect(bridge.invoke('app:ping', { a: 1 })).resolves.toEqual({
      ok: true,
      data: 'pong',
    });
    expect(ipc.invoke).toHaveBeenCalledWith('app:ping', { a: 1 });
  });

  it('when the channel is not allowed, should reject without reaching the main process', async () => {
    const ipc = { invoke: jest.fn() };
    const bridge = createBridge(ipc, ['app:ping']);

    await expect(bridge.invoke('fs:read')).rejects.toThrow(/não permitido: fs:read/);
    expect(ipc.invoke).not.toHaveBeenCalled();
  });

  it('when inspecting the bridge, should expose only invoke', () => {
    const bridge = createBridge({ invoke: jest.fn() }, []);

    expect(Object.keys(bridge)).toEqual(['invoke']);
  });
});
