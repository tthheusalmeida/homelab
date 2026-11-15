import type { IpcErrorCode } from './errors';

export interface IpcErrorPayload {
  code: IpcErrorCode;
  message: string;
}

/** Envelope devolvido por todo canal. */
export type IpcResult<T> = { ok: true; data: T } | { ok: false; error: IpcErrorPayload };

export function ok<T>(data: T): IpcResult<T> {
  return { ok: true, data };
}

export function fail(error: IpcErrorPayload): IpcResult<never> {
  return { ok: false, error };
}
