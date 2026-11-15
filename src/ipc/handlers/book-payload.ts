import { IpcError, IpcErrorCode } from '../../shared/errors';

export const BookPayloadMessages = {
  modulesNotList: 'O campo "modules" deve ser uma lista.',
} as const;

/** Garante que `modules` é uma lista (mesma regra e mensagem do controller do back). */
export function requireModules<T>(value: unknown): T[] {
  if (!Array.isArray(value)) {
    throw new IpcError(IpcErrorCode.VALIDATION, BookPayloadMessages.modulesNotList);
  }

  return value as T[];
}
