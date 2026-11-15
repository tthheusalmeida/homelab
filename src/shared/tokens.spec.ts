import {
  CONTEXT_WARN_FALLBACK_TOKENS,
  checkContext,
  estimateConversationTokens,
  estimateTokens,
} from './tokens';

describe('estimateTokens', () => {
  it('when estimating, should count about one token per 4 characters, rounding up', () => {
    expect(estimateTokens('')).toBe(0);
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcde')).toBe(2);
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});

describe('estimateConversationTokens', () => {
  it('when estimating a conversation, should add every message and the draft', () => {
    const messages = [{ content: 'a'.repeat(40) }, { content: 'b'.repeat(80) }];

    expect(estimateConversationTokens(messages, 'c'.repeat(20))).toBe(10 + 20 + 5);
  });

  it('when there is no history and no draft, should be zero', () => {
    expect(estimateConversationTokens([])).toBe(0);
  });
});

describe('checkContext', () => {
  it('when the model limit is known and the use is below 80%, should not warn', () => {
    expect(checkContext(7_999, 10_000)).toMatchObject({ shouldWarn: false, limit: 10_000 });
  });

  it('when the use reaches 80% of the limit, should warn', () => {
    expect(checkContext(8_000, 10_000)).toMatchObject({ shouldWarn: true, ratio: 0.8 });
  });

  it('when the use is above the limit, should warn', () => {
    expect(checkContext(20_000, 10_000).shouldWarn).toBe(true);
  });

  it('when the limit is unknown, should warn only from the fallback size', () => {
    expect(checkContext(CONTEXT_WARN_FALLBACK_TOKENS - 1, null)).toMatchObject({
      shouldWarn: false,
      limit: null,
      ratio: null,
    });
    expect(checkContext(CONTEXT_WARN_FALLBACK_TOKENS, undefined).shouldWarn).toBe(true);
  });

  it('when the limit is 0 (providers that do not report it), should be treated as unknown', () => {
    expect(checkContext(50_000, 0)).toMatchObject({ limit: null, shouldWarn: false });
  });
});
