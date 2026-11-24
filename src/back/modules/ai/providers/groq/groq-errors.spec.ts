import { GroqEmptyResponseError, GroqErrorMessages, classifyGroqError } from './groq-errors';

const apiError = (status: number, message?: string) =>
  Object.assign(new Error(`HTTP ${status}`), {
    status,
    ...(message ? { error: { error: { message } } } : {}),
  });

describe('classifyGroqError', () => {
  it('when the response is empty, should be retryable', () => {
    expect(classifyGroqError(new GroqEmptyResponseError())).toEqual({
      retryable: true,
      message: GroqErrorMessages.emptyResponse,
    });
  });

  it('when the limit is hit (429), should be retryable', () => {
    expect(classifyGroqError(apiError(429))).toEqual({
      retryable: true,
      message: GroqErrorMessages.rateLimit,
    });
  });

  it('when the server fails (503), should be retryable as overloaded', () => {
    expect(classifyGroqError(apiError(503)).message).toBe(GroqErrorMessages.overloaded);
  });

  it('when the key is refused (401), should not be retryable', () => {
    expect(classifyGroqError(apiError(401))).toEqual({
      retryable: false,
      message: GroqErrorMessages.auth,
    });
  });

  it('when the request is refused with a reason (400), should show the reason', () => {
    expect(classifyGroqError(apiError(400, 'context length exceeded'))).toEqual({
      retryable: false,
      message: 'A Groq não aceitou o pedido: context length exceeded',
    });
  });

  it('when the request is refused without a reason (400), should use the generic message', () => {
    expect(classifyGroqError(apiError(400)).message).toBe(GroqErrorMessages.badRequest);
  });

  it('when the connection fails, should be retryable as network', () => {
    expect(classifyGroqError(new Error('fetch failed'))).toEqual({
      retryable: true,
      message: GroqErrorMessages.network,
    });
  });
});
