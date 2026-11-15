import { IpcDefaultMessages, IpcError, IpcErrorCode } from '../shared/errors';

import { IpcErrorMapper } from './ipc-error-mapper';

const mapper = new IpcErrorMapper();

class HttpLikeError extends Error {
  constructor(
    message: string,
    private readonly status: number,
  ) {
    super(message);
  }

  getStatus(): number {
    return this.status;
  }
}

describe('IpcErrorMapper', () => {
  it('when the error is an IpcError, should keep its code and message', () => {
    expect(mapper.map(new IpcError(IpcErrorCode.NOT_CONFIGURED, 'Falta a chave'))).toEqual({
      code: 'NOT_CONFIGURED',
      message: 'Falta a chave',
    });
  });

  it('when the error is an HTTP 404, should map to NOT_FOUND keeping the message', () => {
    expect(mapper.map(new HttpLikeError('Job não encontrado', 404))).toEqual({
      code: 'NOT_FOUND',
      message: 'Job não encontrado',
    });
  });

  it('when the error is an HTTP 400, should map to VALIDATION keeping the message', () => {
    expect(mapper.map(new HttpLikeError('Título inválido', 400))).toEqual({
      code: 'VALIDATION',
      message: 'Título inválido',
    });
  });

  it('when the error is another HTTP status, should map to INTERNAL', () => {
    expect(mapper.map(new HttpLikeError('Falhou', 502))).toEqual({
      code: 'INTERNAL',
      message: 'Falhou',
    });
  });

  it('when the error is a plain Error, should map to INTERNAL keeping the message', () => {
    expect(mapper.map(new Error('Falha ao converter o vídeo para áudio'))).toEqual({
      code: 'INTERNAL',
      message: 'Falha ao converter o vídeo para áudio',
    });
  });

  it('when the Error has no message, should use the default INTERNAL message', () => {
    expect(mapper.map(new Error(''))).toEqual({
      code: 'INTERNAL',
      message: IpcDefaultMessages.INTERNAL,
    });
  });

  it('when the thrown value is not an Error, should map to INTERNAL with the default message', () => {
    expect(mapper.map('boom')).toEqual({ code: 'INTERNAL', message: IpcDefaultMessages.INTERNAL });
    expect(mapper.map(undefined).code).toBe('INTERNAL');
  });
});
