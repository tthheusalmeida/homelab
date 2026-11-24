import { classifyByStatus, statusOf, type StatusMessages } from './status-error-classifier';

const messages: StatusMessages = {
  rateLimit: 'limite',
  overloaded: 'sobrecarga',
  network: 'rede',
  auth: 'chave',
  modelNotFound: 'modelo',
  badRequest: 'pedido',
  unknown: 'desconhecido',
};

const apiError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('statusOf', () => {
  it('when the error has a numeric status, should return it', () => {
    expect(statusOf(apiError(503))).toBe(503);
  });

  it.each([[new Error('x')], [null], ['texto'], [{ status: '500' }]])(
    'when there is no numeric status (%p), should return undefined',
    (error) => {
      expect(statusOf(error)).toBeUndefined();
    },
  );
});

describe('classifyByStatus', () => {
  it.each([
    [429, true, 'limite'],
    [500, true, 'sobrecarga'],
    [503, true, 'sobrecarga'],
    [529, true, 'sobrecarga'],
    [401, false, 'chave'],
    [403, false, 'chave'],
    [404, false, 'modelo'],
    [400, false, 'pedido'],
    [413, false, 'pedido'],
    [418, false, 'desconhecido'],
  ])(
    'when the status is %s, should answer retryable=%s with its message',
    (status, retryable, message) => {
      expect(classifyByStatus(apiError(status), messages)).toEqual({ retryable, message });
    },
  );

  it.each(['fetch failed', 'ECONNRESET', 'getaddrinfo ENOTFOUND x', 'request timed out'])(
    'when there is no status and the text says "%s", should be a retryable network error',
    (text) => {
      expect(classifyByStatus(new TypeError(text), messages)).toEqual({
        retryable: true,
        message: 'rede',
      });
    },
  );

  it('when the network failure is in the cause, should still be a network error', () => {
    const error = new Error('falhou', { cause: new Error('ECONNREFUSED') });

    expect(classifyByStatus(error, messages)).toEqual({ retryable: true, message: 'rede' });
  });

  it('when there is no status and nothing looks like network, should be unknown', () => {
    expect(classifyByStatus(new Error('api'), messages)).toEqual({
      retryable: false,
      message: 'desconhecido',
    });
  });

  it('when the value is not an Error, should read it as text', () => {
    expect(classifyByStatus('socket hang up', messages)).toEqual({
      retryable: true,
      message: 'rede',
    });
  });
});
