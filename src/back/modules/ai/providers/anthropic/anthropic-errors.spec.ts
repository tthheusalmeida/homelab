import {
  AnthropicEmptyResponseError,
  AnthropicErrorMessages,
  AnthropicRefusalError,
  classifyAnthropicError,
} from './anthropic-errors';

const apiError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

describe('classifyAnthropicError', () => {
  it.each([
    [429, true, AnthropicErrorMessages.rateLimit],
    [500, true, AnthropicErrorMessages.overloaded],
    [529, true, AnthropicErrorMessages.overloaded],
    [401, false, AnthropicErrorMessages.auth],
    [403, false, AnthropicErrorMessages.auth],
    [404, false, AnthropicErrorMessages.modelNotFound],
    [400, false, AnthropicErrorMessages.badRequest],
    [413, false, AnthropicErrorMessages.badRequest],
  ])('when the status is %s, should classify it', (status, retryable, message) => {
    expect(classifyAnthropicError(apiError(status))).toEqual({ retryable, message });
  });

  it('when the 400 says the credit balance is too low, should explain the missing credit', () => {
    const error = Object.assign(new Error('400'), {
      status: 400,
      error: {
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message: 'Your credit balance is too low to access the Anthropic API.',
        },
      },
    });

    expect(classifyAnthropicError(error)).toEqual({
      retryable: false,
      message: AnthropicErrorMessages.noCredit,
    });
  });

  it('when the 400 carries a reason, should show the reason from the API', () => {
    const error = Object.assign(new Error('400'), {
      status: 400,
      error: { type: 'error', error: { message: 'max_tokens: 32000 > 8192' } },
    });

    expect(classifyAnthropicError(error)).toEqual({
      retryable: false,
      message: 'A Anthropic não aceitou o pedido: max_tokens: 32000 > 8192',
    });
  });

  it('when the response is empty, should be retryable', () => {
    expect(classifyAnthropicError(new AnthropicEmptyResponseError())).toEqual({
      retryable: true,
      message: AnthropicErrorMessages.emptyResponse,
    });
  });

  it('when the answer was a refusal, should not be retryable', () => {
    expect(classifyAnthropicError(new AnthropicRefusalError())).toEqual({
      retryable: false,
      message: AnthropicErrorMessages.refusal,
    });
  });

  it('when the connection fails without a status, should be retryable as network', () => {
    expect(classifyAnthropicError(new TypeError('fetch failed'))).toEqual({
      retryable: true,
      message: AnthropicErrorMessages.network,
    });
  });

  it('when the error is unknown, should not be retryable and use the generic message', () => {
    expect(classifyAnthropicError(new Error('api'))).toEqual({
      retryable: false,
      message: AnthropicErrorMessages.unknown,
    });
  });
});
