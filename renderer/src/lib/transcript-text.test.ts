import { describe, expect, it } from 'vitest';

import { excerptPreview } from './transcript-text';

describe('excerptPreview', () => {
  it('when the text is long, should keep the first words and add an ellipsis', () => {
    expect(excerptPreview('Olá pessoal hoje vamos configurar o ambiente')).toBe(
      'Olá pessoal hoje vamos configurar…',
    );
  });

  it('when the text is short, should return it whole without an ellipsis', () => {
    expect(excerptPreview('Só quatro palavras aqui')).toBe('Só quatro palavras aqui');
  });

  it('when the text has extra spaces and breaks, should collapse them', () => {
    expect(excerptPreview('  a   b\n c  ', 5)).toBe('a b c');
  });

  it('when the text is empty, should return an empty string', () => {
    expect(excerptPreview('   ')).toBe('');
  });

  it('when a different number of words is asked, should respect it', () => {
    expect(excerptPreview('um dois três quatro', 2)).toBe('um dois…');
  });
});
