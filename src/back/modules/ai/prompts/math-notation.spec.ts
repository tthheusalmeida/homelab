import { JSON_MATH_RULES, SUMMARY_MATH_RULES } from './math-notation';

describe('math notation rules', () => {
  it.each([
    ['summary', SUMMARY_MATH_RULES],
    ['json', JSON_MATH_RULES],
  ])(
    'when reading the %s rules, should ask for LaTeX in dollars and escaped money',
    (_name, rules) => {
      expect(rules).toContain('LaTeX entre cifrões');
      expect(rules).toContain(String.raw`R\$ 10`);
      expect(rules).toContain('não a reconstrua nem a invente');
    },
  );

  it.each([
    ['summary', SUMMARY_MATH_RULES],
    ['json', JSON_MATH_RULES],
  ])(
    'when reading the %s rules, should forbid bare symbols and win over "no markdown"',
    (_name, rules) => {
      expect(rules).toContain('nunca escreva');
      expect(rules).toContain('mesmo que outra instrução peça "sem markdown"');
    },
  );

  it.each([
    ['summary', SUMMARY_MATH_RULES],
    ['json', JSON_MATH_RULES],
  ])('when reading the %s rules, should forbid backticks around formulas', (_name, rules) => {
    expect(rules).toContain('sem nenhuma crase');
  });

  it('when reading the summary rules, should allow display blocks with double dollars', () => {
    expect(SUMMARY_MATH_RULES).toContain('$$');
  });

  it('when reading the json rules, should forbid display blocks and ask to double the backslash', () => {
    expect(JSON_MATH_RULES).toContain('nunca `$$`');
    expect(JSON_MATH_RULES).toContain('dobre cada barra invertida');
  });
});
