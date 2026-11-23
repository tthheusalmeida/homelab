import { significantWords } from './search-words';

describe('significantWords', () => {
  it('when there are longer words, should drop the ones with up to 2 letters', () => {
    expect(significantWords(['casa', 'da', 'vida'])).toEqual(['casa', 'vida']);
  });

  it('when every word is short, should keep them all', () => {
    expect(significantWords(['de', 'ai'])).toEqual(['de', 'ai']);
  });

  it('when the list is empty, should return nothing', () => {
    expect(significantWords([])).toEqual([]);
  });
});
