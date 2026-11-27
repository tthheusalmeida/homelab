import {
  CONTEXT_INSTRUCTION_TOKENS,
  LARGE_WINDOW_TOKENS,
  SMALL_WINDOW_TOKENS,
  contextBudget,
  contextOverheadTokens,
} from './rag-budget';

describe('contextBudget', () => {
  it('when the window is unknown, should use the medium budget', () => {
    expect(contextBudget()).toEqual(contextBudget(32_768));
    expect(contextBudget(null)).toEqual(contextBudget(32_768));
    expect(contextBudget(0)).toEqual(contextBudget(32_768));
    expect(contextBudget(Number.NaN)).toEqual(contextBudget(32_768));
  });

  it('when the window is short, should give fewer and smaller excerpts than the medium one', () => {
    const small = contextBudget(SMALL_WINDOW_TOKENS - 1);

    expect(small.maxHits).toBeLessThan(contextBudget().maxHits);
    expect(small.maxChars).toBeLessThan(contextBudget().maxChars);
  });

  it('when the window is long, should give more and larger excerpts than the medium one', () => {
    const large = contextBudget(LARGE_WINDOW_TOKENS);

    expect(large.maxHits).toBeGreaterThan(contextBudget().maxHits);
    expect(large.maxChars).toBeGreaterThan(contextBudget().maxChars);
  });

  it('when the window sits exactly on a boundary, should belong to the larger class', () => {
    expect(contextBudget(SMALL_WINDOW_TOKENS)).toEqual(contextBudget());
    expect(contextBudget(LARGE_WINDOW_TOKENS)).toEqual(contextBudget(262_144));
  });
});

describe('contextOverheadTokens', () => {
  it('when the window is long, should add more tokens than for a short one', () => {
    expect(contextOverheadTokens(262_144)).toBeGreaterThan(contextOverheadTokens(4096));
  });

  it('when computed, should cover the fixed instruction plus the largest excerpts allowed', () => {
    const { maxChars } = contextBudget(4096);

    expect(contextOverheadTokens(4096)).toBe(CONTEXT_INSTRUCTION_TOKENS + Math.ceil(maxChars / 4));
  });
});

describe('contextBudget pelo tamanho do modelo', () => {
  const HUGE_WINDOW = 262_144;

  it('when the model is tiny but announces a huge window, should still get the short budget', () => {
    expect(contextBudget(HUGE_WINDOW, 0.8)).toEqual(contextBudget(4096));
  });

  it('when the model is small (about 4b) with a huge window, should get at most the medium budget', () => {
    expect(contextBudget(HUGE_WINDOW, 4)).toEqual(contextBudget());
  });

  it('when the model is big, should follow the window', () => {
    expect(contextBudget(HUGE_WINDOW, 9)).toEqual(contextBudget(HUGE_WINDOW));
    expect(contextBudget(HUGE_WINDOW, 9).maxHits).toBeGreaterThan(contextBudget().maxHits);
  });

  it('when the size is unknown (cloud model), should follow the window alone', () => {
    expect(contextBudget(HUGE_WINDOW, null)).toEqual(contextBudget(HUGE_WINDOW));
    expect(contextBudget(HUGE_WINDOW, 0)).toEqual(contextBudget(HUGE_WINDOW));
  });

  it('when the window is short and the model is big, should still get the short budget', () => {
    expect(contextBudget(4096, 70)).toEqual(contextBudget(4096));
  });

  it('when only the size is known, should not go above the medium budget', () => {
    expect(contextBudget(undefined, 70)).toEqual(contextBudget());
    expect(contextBudget(undefined, 0.8)).toEqual(contextBudget(4096));
  });

  it('when the overhead is estimated for a tiny model, should be smaller than for a big one', () => {
    expect(contextOverheadTokens(HUGE_WINDOW, 0.8)).toBeLessThan(
      contextOverheadTokens(HUGE_WINDOW, 9),
    );
  });
});
