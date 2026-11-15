import { IpcDefaultMessages, IpcError, IpcErrorCode } from '../shared/errors';
import type { IpcErrorPayload } from '../shared/result';

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;

interface HttpLikeError {
  getStatus(): number;
  message?: string;
}

function isHttpLike(error: unknown): error is HttpLikeError {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as { getStatus?: unknown }).getStatus === 'function'
  );
}

/**
 * Converte qualquer exceção em `{ code, message }` — o único lugar com essa regra.
 * - `IpcError`: mantém código e mensagem.
 * - Exceções HTTP do Nest (duck typing, sem importar o Nest): 404 → NOT_FOUND, 400 → VALIDATION.
 * - Demais: INTERNAL, preservando a mensagem em português já existente nos services.
 */
export class IpcErrorMapper {
  map(error: unknown): IpcErrorPayload {
    if (error instanceof IpcError) {
      return { code: error.code, message: error.message };
    }

    if (isHttpLike(error)) {
      const status = error.getStatus();

      if (status === HTTP_NOT_FOUND) {
        return this.build(IpcErrorCode.NOT_FOUND, error.message);
      }

      if (status === HTTP_BAD_REQUEST) {
        return this.build(IpcErrorCode.VALIDATION, error.message);
      }
    }

    return this.build(IpcErrorCode.INTERNAL, error instanceof Error ? error.message : undefined);
  }

  private build(code: IpcErrorCode, message?: string): IpcErrorPayload {
    return { code, message: message?.trim() ? message : IpcDefaultMessages[code] };
  }
}
