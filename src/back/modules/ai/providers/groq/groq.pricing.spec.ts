import { groqCatalog } from './groq.pricing';

describe('groqCatalog', () => {
  it('when asked for the cheapest model, should answer gpt-oss-20b', () => {
    expect(groqCatalog.cheapest()).toBe('openai/gpt-oss-20b');
  });

  it('when ordering by cost, should go from the cheapest to the most expensive', () => {
    expect(groqCatalog.byCost()).toEqual([
      'openai/gpt-oss-20b',
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
    ]);
  });

  it('when computing the cost of 1M input and 1M output on gpt-oss-120b, should be 0.75', () => {
    expect(groqCatalog.cost('openai/gpt-oss-120b', 1_000_000, 1_000_000)).toBeCloseTo(0.75);
  });

  it('when the model is not registered, should not know it and cost 0', () => {
    expect(groqCatalog.has('llama-3.3-70b-versatile')).toBe(false);
    expect(groqCatalog.cost('llama-3.3-70b-versatile', 1000, 1000)).toBe(0);
  });
});
