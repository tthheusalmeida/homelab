import {
  anthropicModelsByCost,
  anthropicPricing,
  cheapestAnthropicModel,
  isPricedAnthropicModel,
  normalizeAnthropicModel,
} from './anthropic.pricing';

describe('normalizeAnthropicModel', () => {
  it('when the id has a date suffix, should remove it', () => {
    expect(normalizeAnthropicModel('claude-haiku-4-5-20251001')).toBe('claude-haiku-4-5');
  });

  it('when the id has no date suffix, should keep it', () => {
    expect(normalizeAnthropicModel('claude-opus-5-5')).toBe('claude-opus-5-5');
  });
});

describe('isPricedAnthropicModel', () => {
  it('when the model is open and registered, should be true even with a date suffix', () => {
    expect(isPricedAnthropicModel('claude-sonnet-4-5-20250929')).toBe(true);
  });

  it.each(['claude-mythos-5-2', 'claude-opus-4-1', 'claude-sonnet-4', 'outro'])(
    'when the model is restricted, retired or unknown (%s), should be false',
    (model) => {
      expect(isPricedAnthropicModel(model)).toBe(false);
    },
  );
});

describe('anthropicPricing', () => {
  it('when the model has a single price, should return it', () => {
    expect(anthropicPricing('claude-opus-5-5')).toEqual({
      inputPerMillionTokens: 4,
      outputPerMillionTokens: 20,
    });
  });

  it('when the Haiku 5.5 prompt is up to 100 thousand tokens, should use the low tier', () => {
    expect(anthropicPricing('claude-haiku-5-5', 100_000)).toEqual({
      inputPerMillionTokens: 0.1,
      outputPerMillionTokens: 0.5,
    });
  });

  it('when the Haiku 5.5 prompt is over 100 thousand tokens, should use the high tier', () => {
    expect(anthropicPricing('claude-haiku-5-5', 100_001)).toEqual({
      inputPerMillionTokens: 0.5,
      outputPerMillionTokens: 2.5,
    });
  });

  it('when the model is not registered, should return undefined', () => {
    expect(anthropicPricing('claude-mythos-5-2')).toBeUndefined();
  });
});

describe('anthropicModelsByCost', () => {
  it('when listing the models, should order them from the cheapest to the most expensive', () => {
    const costs = anthropicModelsByCost().map((name) => {
      const price = anthropicPricing(name)!;

      return price.inputPerMillionTokens + price.outputPerMillionTokens;
    });

    expect(costs).toEqual([...costs].sort((a, b) => a - b));
  });

  it('when listing the models, should start with the cheapest and end with the dearest', () => {
    const models = anthropicModelsByCost();

    expect(models[0]).toBe('claude-haiku-5-5');
    expect(cheapestAnthropicModel()).toBe('claude-haiku-5-5');
    expect(models.at(-1)).toMatch(/^claude-fable-5(-1)?$/);
  });
});
