import {
  classifyGeminiError,
  GeminiEmptyResponseError,
  GeminiErrorMessages,
} from './gemini-errors';

const apiError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('classifyGeminiError', () => {
  it('when the usage limit is reached (429), should be transient with the limit message', () => {
    expect(classifyGeminiError(apiError(429))).toEqual({
      retryable: true,
      message: GeminiErrorMessages.rateLimit,
    });
  });

  it.each([500, 502, 503, 504])(
    'when the service fails with %s, should be transient with the overloaded message',
    (status) => {
      expect(classifyGeminiError(apiError(status))).toEqual({
        retryable: true,
        message: GeminiErrorMessages.overloaded,
      });
    },
  );

  it('when the response has no text, should be transient with the empty message', () => {
    expect(classifyGeminiError(new GeminiEmptyResponseError())).toEqual({
      retryable: true,
      message: GeminiErrorMessages.emptyResponse,
    });
  });

  it.each([
    [401, GeminiErrorMessages.auth],
    [403, GeminiErrorMessages.auth],
    [404, GeminiErrorMessages.modelNotFound],
    [400, GeminiErrorMessages.badRequest],
  ])('when the status is %s, should not retry and explain it', (status, message) => {
    expect(classifyGeminiError(apiError(status))).toEqual({ retryable: false, message });
  });

  it('when the connection fails with no status, should be transient with the network message', () => {
    expect(classifyGeminiError(new TypeError('fetch failed'))).toEqual({
      retryable: true,
      message: GeminiErrorMessages.network,
    });
  });

  it('when the network failure is only in the cause, should still be detected', () => {
    const error = new Error('request failed', { cause: new Error('getaddrinfo ENOTFOUND host') });

    expect(classifyGeminiError(error).retryable).toBe(true);
  });

  it('when the error is unknown, should not retry and keep the generic message', () => {
    expect(classifyGeminiError(new Error('api'))).toEqual({
      retryable: false,
      message: GeminiErrorMessages.unknown,
    });
    expect(classifyGeminiError('texto')).toMatchObject({ retryable: false });
  });

  it('when an unexpected status shows up (418), should not retry', () => {
    expect(classifyGeminiError(apiError(418)).retryable).toBe(false);
  });
});
