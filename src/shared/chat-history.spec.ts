import {
  KEEP_RECENT_MESSAGES,
  historyBudget,
  historyTokens,
  summaryCut,
  unsummarized,
} from './chat-history';

const turns = (count: number, chars = 400) =>
  Array.from({ length: count }, (_, index) => ({
    role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
    content: 'a'.repeat(chars),
  }));

describe('historyBudget', () => {
  it('when the model is small, should keep the budget low even with a huge window', () => {
    expect(historyBudget(262_144, 2)).toBe(3_000);
  });

  it('when the window is short, should use a fraction of it', () => {
    expect(historyBudget(8_192, 70)).toBe(2_457);
  });

  it('when the window is tiny, should never go under the minimum', () => {
    expect(historyBudget(2_000, null)).toBe(1_500);
  });

  it('when nothing is known about the model, should use the default', () => {
    expect(historyBudget(undefined, undefined)).toBe(8_000);
  });
});

describe('summaryCut', () => {
  it('when the history fits the budget, should not summarize', () => {
    expect(summaryCut(turns(6), null, 10_000)).toBeNull();
  });

  it('when the history is over the budget, should keep the recent messages and cut at a user turn', () => {
    const cut = summaryCut(turns(20), null, 1_000);

    expect(cut).toBe(20 - KEEP_RECENT_MESSAGES);
  });

  it('when the digest already covers the old part, should only count what is left', () => {
    expect(summaryCut(turns(20), { text: 'resumo', upTo: 16 }, 1_000)).toBeNull();
  });

  it('when there are too few messages to cut, should not summarize', () => {
    expect(summaryCut(turns(KEEP_RECENT_MESSAGES), null, 1)).toBeNull();
  });
});

describe('unsummarized', () => {
  it('when there is a digest, should drop the messages it covers', () => {
    expect(unsummarized([1, 2, 3, 4], { text: 'x', upTo: 2 })).toEqual([3, 4]);
  });

  it('when there is no digest, should keep everything', () => {
    expect(unsummarized([1, 2], undefined)).toEqual([1, 2]);
  });
});

describe('historyTokens', () => {
  it('when a digest covers old messages, should count the digest instead of them', () => {
    const messages = turns(10, 4_000);

    expect(historyTokens(messages, { text: 'a'.repeat(400), upTo: 8 })).toBe(100 + 2 * 1_000);
  });

  it('when there is no digest, should count everything plus the draft', () => {
    expect(historyTokens(turns(2, 400), null, 'a'.repeat(40))).toBe(2 * 100 + 10);
  });
});
