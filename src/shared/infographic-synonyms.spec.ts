import {
  INFOGRAPHIC_SYNONYM_GROUPS,
  singular,
  synonymsOf,
  synonymWordsInManyGroups,
} from './infographic-synonyms';

describe('singular', () => {
  it.each([
    ['automóveis', 'automovel'],
    ['remédios', 'remedio'],
    ['mensagens', 'mensagem'],
    ['funções', 'funcao'],
    ['animais', 'animal'],
    ['cores', 'cor'],
    ['dinheiro', 'dinheiro'],
    ['pc', 'pc'],
  ])('when the word is %s, should compare as %s', (word, expected) => {
    expect(singular(word)).toBe(expected);
  });
});

describe('synonymsOf', () => {
  it('when the word is in a group, should answer the other words of it', () => {
    expect(synonymsOf('carro')).toEqual(expect.arrayContaining(['automovel', 'veiculo']));
    expect(synonymsOf('carro')).not.toContain('carro');
  });

  it('when the word has accents or capitals, should still find its group', () => {
    expect(synonymsOf('Automóvel')).toContain('carro');
  });

  it('when the word is a plural, should find the group by the singular', () => {
    expect(synonymsOf('automóveis')).toContain('carro');
    expect(synonymsOf('remédios')).toContain('farmaco');
  });

  it('when the word is in no group, should answer nothing', () => {
    expect(synonymsOf('xilofone')).toEqual([]);
    expect(synonymsOf('')).toEqual([]);
  });

  it('when the word is only a different ending of a member (plural), should not answer that member', () => {
    expect(synonymsOf('dinheiros')).not.toContain('dinheiro');
  });

  it('when two words only share the first letters, should not mix their groups', () => {
    expect(synonymsOf('empresa')).not.toContain('trabalho');
    expect(synonymsOf('contrato')).not.toContain('contagem');
  });
});

describe('the synonym table', () => {
  it('when listing the groups, should have a good number of them', () => {
    expect(INFOGRAPHIC_SYNONYM_GROUPS).toBeGreaterThan(100);
  });

  it('when looking for words in more than one group, should find none', () => {
    expect(synonymWordsInManyGroups()).toEqual([]);
  });
});
