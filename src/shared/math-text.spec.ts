import { mapOutsideMath, splitMath } from './math-text';

describe('splitMath', () => {
  it('when the text has no formula, should return one text segment', () => {
    expect(splitMath('Só texto')).toEqual([{ kind: 'text', value: 'Só texto' }]);
  });

  it('when the text has a formula in the middle, should split prose and math', () => {
    expect(splitMath('termos ($F_1 = 1$) iguais')).toEqual([
      { kind: 'text', value: 'termos (' },
      { kind: 'math', value: 'F_1 = 1' },
      { kind: 'text', value: ') iguais' },
    ]);
  });

  it('when the text is only a formula, should return no empty prose', () => {
    expect(splitMath('$x^2$')).toEqual([{ kind: 'math', value: 'x^2' }]);
  });

  it('when there are two formulas, should find both', () => {
    const kinds = splitMath('$a$ e $b$').map((segment) => segment.kind);

    expect(kinds).toEqual(['math', 'text', 'math']);
  });

  it('when the dollars are money, should keep them as text', () => {
    expect(splitMath('custa R$ 10 e R$ 20')).toEqual([
      { kind: 'text', value: 'custa R$ 10 e R$ 20' },
    ]);
    expect(splitMath('R$10 e R$20')).toEqual([{ kind: 'text', value: 'R$10 e R$20' }]);
  });

  it('when a dollar is escaped, should turn it into a plain dollar', () => {
    expect(splitMath('R\\$ 5 e R\\$ 6')).toEqual([{ kind: 'text', value: 'R$ 5 e R$ 6' }]);
  });

  it('when a dollar is never closed, should keep it as text', () => {
    expect(splitMath('use $HOME aqui')).toEqual([{ kind: 'text', value: 'use $HOME aqui' }]);
  });
});

describe('mapOutsideMath', () => {
  const upper = (prose: string): string => prose.toUpperCase();

  it('when the text has a formula, should transform only the prose', () => {
    expect(mapOutsideMath('veja $a_b$ agora', upper)).toBe('VEJA $a_b$ AGORA');
  });

  it('when the text has no formula, should transform all of it', () => {
    expect(mapOutsideMath('sem fórmula', upper)).toBe('SEM FÓRMULA');
  });

  it('when the dollar is escaped, should hand it to the transform untouched', () => {
    expect(mapOutsideMath('R\\$ 5', (prose) => prose)).toBe('R\\$ 5');
  });
});
