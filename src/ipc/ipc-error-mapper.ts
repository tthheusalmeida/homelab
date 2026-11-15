import { IpcDefaultMessages, IpcError, IpcErrorCode } from '../shared/errors';
import type { IpcErrorPayload } from '../shared/result';

const HTTP_NOT_FOUND = 404;
const HTTP_BAD_REQUEST = 400;
const HTTP_BAD_GATEWAY = 502;

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

/** `IpcError` de configuração ausente escondido na `cause` de outro erro. */
function notConfiguredCause(error: unknown): IpcError | null {
  const cause = error instanceof Error ? error.cause : undefined;

  return cause instanceof IpcError && cause.code === IpcErrorCode.NOT_CONFIGURED ? cause : null;
}

/**
 * Converte qualquer exceção em `{ code, message }` — o único lugar com essa regra.
 * - `IpcError`: mantém código e mensagem.
 * - Erro que embrulha um `IpcError` `NOT_CONFIGURED` na `cause` (ex.: sugestão de IA sem chave do Gemini):
 *   devolve o código de configuração, com a mensagem que leva às Configurações.
 * - Exceções HTTP do Nest (duck typing, sem importar o Nest): 404 → NOT_FOUND, 400 → VALIDATION,
 *   502 → PROVIDER_FAILED (falha de um serviço externo, como a IA).
 * - Demais: INTERNAL, preservando a mensagem em português já existente nos services.
 */
export class IpcErrorMapper {
  map(error: unknown): IpcErrorPayload {
    if (error instanceof IpcError) {
      return { code: error.code, message: error.message };
    }

    const wrapped = notConfiguredCause(error);

    if (wrapped) {
      return { code: wrapped.code, message: wrapped.message };
    }

    if (isHttpLike(error)) {
      const status = error.getStatus();

      if (status === HTTP_NOT_FOUND) {
        return this.build(IpcErrorCode.NOT_FOUND, error.message);
      }

      if (status === HTTP_BAD_REQUEST) {
        return this.build(IpcErrorCode.VALIDATION, error.message);
      }

      if (status === HTTP_BAD_GATEWAY) {
        return this.build(IpcErrorCode.PROVIDER_FAILED, error.message);
      }
    }

    return this.build(IpcErrorCode.INTERNAL, error instanceof Error ? error.message : undefined);
  }

  private build(code: IpcErrorCode, message?: string): IpcErrorPayload {
    return { code, message: message?.trim() ? message : IpcDefaultMessages[code] };
  }
}
