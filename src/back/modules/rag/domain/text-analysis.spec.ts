import { analyze, editDistance, normalizeText, stem, tokenize } from './text-analysis';

describe('normalizeText', () => {
  it('when the text has accents and capitals, should return it plain and lower case', () => {
    expect(normalizeText('Ação Rápida')).toBe('acao rapida');
  });
});

describe('tokenize', () => {
  it('when the text has punctuation, should split it into plain words', () => {
    expect(tokenize('Olá, mundo! (yt-dlp)')).toEqual(['ola', 'mundo', 'yt', 'dlp']);
  });

  it('when a piece has one letter, should drop it but keep a lone digit', () => {
    expect(tokenize('a 3 b cc')).toEqual(['3', 'cc']);
  });
});

describe('stem', () => {
  it.each([
    ['maneiras', 'maneira'],
    ['primeira', 'primeiro'],
    ['informacoes', 'informacao'],
    ['persistencia', 'persistente'],
    ['processos', 'processamento'],
    ['itens', 'item'],
  ])('when the words "%s" and "%s" mean the same, should give both the same stem', (a, b) => {
    expect(stem(a)).toBe(stem(b));
  });

  it('when the word is short, should leave it alone', () => {
    expect(stem('app')).toBe('app');
  });

  it('when the token is a number, should leave it alone', () => {
    expect(stem('2024')).toBe('2024');
  });

  it('when a suffix would leave too little of the word, should not cut it', () => {
    expect(stem('amar')).toBe('amar');
  });
});

describe('analyze', () => {
  it('when the question has filler words, should keep only the useful stems', () => {
    expect(analyze('O que diz a primeira maneira do DevOps?')).toEqual([
      stem('primeira'),
      stem('maneira'),
      stem('devops'),
    ]);
  });

  it('when the message is only a greeting, should have nothing to search for', () => {
    expect(analyze('Oi, tudo bem? Obrigado!')).toEqual([]);
  });

  it('when the same word comes in plural and with accents, should give the same terms', () => {
    expect(analyze('Práticas')).toEqual(analyze('pratica'));
  });
});

describe('editDistance', () => {
  it('when two letters are swapped, should count one edit', () => {
    expect(editDistance('devosp', 'devops', 2)).toBe(1);
  });

  it('when one letter is missing, should count one edit', () => {
    expect(editDistance('maneir', 'maneira', 2)).toBe(1);
  });

  it('when the words are equal, should count zero', () => {
    expect(editDistance('fluxo', 'fluxo', 2)).toBe(0);
  });

  it('when the words are far apart, should return more than the limit', () => {
    expect(editDistance('fluxo', 'pipeline', 2)).toBeGreaterThan(2);
  });

  it('when the lengths differ by more than the limit, should return more than the limit', () => {
    expect(editDistance('ab', 'abcdef', 2)).toBe(3);
  });
});

describe('analyze: palavras de conversa não são assunto', () => {
  it('when the question is wrapped in conversation words, should keep only the subject', () => {
    expect(analyze('Vamos falar só sobre telemetria, temos algo assim?')).toEqual([
      stem('telemetria'),
    ]);
  });

  it('when the message is only conversation, should have nothing to search for', () => {
    expect(analyze('Então, agora vamos, por favor')).toEqual([]);
  });
});
