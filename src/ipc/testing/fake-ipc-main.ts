import type { IpcMainLike } from '../ipc-main-like';

type Listener = (event: unknown, payload: unknown) => unknown;

/** `ipcMain` falso para testes: guarda os listeners e permite chamá-los. */
export class FakeIpcMain implements IpcMainLike {
  private readonly listeners = new Map<string, Listener>();

  handle(channel: string, listener: Listener): void {
    this.listeners.set(channel, listener);
  }

  channels(): string[] {
    return [...this.listeners.keys()];
  }

  invoke(channel: string, payload?: unknown): Promise<unknown> {
    const listener = this.listeners.get(channel);

    if (!listener) {
      return Promise.reject(new Error(`No handler for ${channel}`));
    }

    return Promise.resolve(listener({}, payload));
  }
}
