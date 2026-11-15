import { IpcError, IpcErrorCode } from '../../shared/errors';

export const LibraryPayloadMessages = {
  notStringList: (field: string) => `O campo "${field}" deve ser uma lista de textos.`,
} as const;

/** Garante que o campo é uma lista de textos (mesma regra e mensagem do controller do back). */
export function requireStringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new IpcError(IpcErrorCode.VALIDATION, LibraryPayloadMessages.notStringList(field));
  }

  return value as string[];
}

export function optionalStringList(value: unknown, field: string): string[] | undefined {
  return value === undefined ? undefined : requireStringList(value, field);
}
