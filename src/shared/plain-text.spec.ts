import { plainText } from './plain-text';

describe('plainText', () => {
  it('when the value is not a string, should return empty', () => {
    expect(plainText(42)).toBe('');
    expect(plainText(null)).toBe('');
  });

  it('when the text has markdown, should strip it and collapse spaces', () => {
    expect(plainText('  **Olá**   `mundo`\n# fim ')).toBe('Olá mundo fim');
  });

  it('when the text has a formula, should keep its underscores and symbols', () => {
    expect(plainText('**Soma** $F_n = F_{n-1} + F_{n-2}$')).toBe('Soma $F_n = F_{n-1} + F_{n-2}$');
  });

  it('when the dollar is escaped money, should keep it for the screen to unescape', () => {
    expect(plainText('custa R\\$ 10')).toBe('custa R\\$ 10');
  });
});
