import { ModelCatalog } from './model-catalog';

const flat = new Map([
  ['caro', { inputPerMillionTokens: 10, outputPerMillionTokens: 30 }],
  ['barato', { inputPerMillionTokens: 1, outputPerMillionTokens: 2 }],
  ['medio', { inputPerMillionTokens: 3, outputPerMillionTokens: 7 }],
]);

describe('ModelCatalog', () => {
  describe('with one price per model', () => {
    const catalog = ModelCatalog.flat(flat);

    it('when asking for a registered model, should say it is there', () => {
      expect(catalog.has('barato')).toBe(true);
      expect(catalog.has('outro')).toBe(false);
    });

    it('when listing by cost, should go from the cheapest to the most expensive', () => {
      expect(catalog.byCost()).toEqual(['barato', 'medio', 'caro']);
      expect(catalog.cheapest()).toBe('barato');
    });

    it('when two models cost the same, should break the tie by name', () => {
      const tied = ModelCatalog.flat(
        new Map([
          ['b', { inputPerMillionTokens: 1, outputPerMillionTokens: 1 }],
          ['a', { inputPerMillionTokens: 1, outputPerMillionTokens: 1 }],
        ]),
      );

      expect(tied.byCost()).toEqual(['a', 'b']);
    });

    it('when computing the cost, should price input and output per million tokens', () => {
      expect(catalog.cost('medio', 2_000_000, 1_000_000)).toBe(13);
    });

    it('when the model is not registered, should cost 0 and have no price', () => {
      expect(catalog.cost('outro', 1000, 1000)).toBe(0);
      expect(catalog.price('outro')).toBeUndefined();
    });

    it('when ranking models, should give the position by cost and -1 for unknown ones', () => {
      expect(catalog.rank('barato')).toBe(0);
      expect(catalog.rank('caro')).toBe(2);
      expect(catalog.rank('outro')).toBe(-1);
    });

    it('when the catalog is empty, should have no cheapest model', () => {
      expect(ModelCatalog.flat(new Map()).cheapest()).toBe('');
    });
  });

  describe('with prompt tiers and a normalizer', () => {
    const catalog = new ModelCatalog(
      new Map([
        [
          'm',
          [
            { maxPromptTokens: 100, inputPerMillionTokens: 1, outputPerMillionTokens: 2 },
            { inputPerMillionTokens: 5, outputPerMillionTokens: 6 },
          ],
        ],
      ]),
      (model) => model.replace(/-v\d+$/, ''),
    );

    it('when the prompt fits the first tier, should use its price (limit included)', () => {
      expect(catalog.price('m', 100)).toEqual({
        inputPerMillionTokens: 1,
        outputPerMillionTokens: 2,
      });
    });

    it('when the prompt is over the first tier, should use the next price', () => {
      expect(catalog.price('m', 101)).toEqual({
        inputPerMillionTokens: 5,
        outputPerMillionTokens: 6,
      });
    });

    it('when the id carries a suffix the normalizer removes, should still find the model', () => {
      expect(catalog.has('m-v2')).toBe(true);
      expect(catalog.rank('m-v2')).toBe(0);
    });

    it('when ordering by cost, should use the first tier (short prompt)', () => {
      expect(catalog.byCost()).toEqual(['m']);
    });
  });
});
