import { cheapestModel, modelsByCost, pricing } from './gemini.pricing';

describe('cheapestModel', () => {
  it('when models have different prices, should return the one with the lowest input plus output cost', () => {
    const costs = [...pricing.entries()].map(([name, price]) => ({
      name,
      cost: price.inputPerMillionTokens + price.outputPerMillionTokens,
    }));
    const lowest = Math.min(...costs.map((entry) => entry.cost));

    expect(pricing.has(cheapestModel())).toBe(true);
    expect(costs.find((entry) => entry.name === cheapestModel())?.cost).toBe(lowest);
  });
});

describe('modelsByCost', () => {
  it('when listing the models, should order them from the cheapest to the most expensive', () => {
    const costs = modelsByCost().map((name) => {
      const price = pricing.get(name)!;

      return price.inputPerMillionTokens + price.outputPerMillionTokens;
    });

    expect(costs).toEqual([...costs].sort((a, b) => a - b));
  });

  it('when listing the models, should include every priced model once, starting with the cheapest', () => {
    expect(modelsByCost()).toHaveLength(pricing.size);
    expect(modelsByCost()[0]).toBe(cheapestModel());
  });
});
