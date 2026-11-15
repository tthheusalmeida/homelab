/**
 * Parte mínima do `ipcMain` que o app usa. O Electron real e o falso dos
 * testes implementam esta interface; nada fora de `main/index.ts` importa `electron`.
 */
export interface IpcMainLike {
  handle(channel: string, listener: (event: unknown, payload: unknown) => unknown): void;
}
