import type { OcrLines } from './ocr-engine.port';
import { buildPageText, MIN_WORD_CONFIDENCE } from './ocr-text';

const word = (text: string, confidence = 95) => ({ text, confidence });
const line = (text: string, confidence = 95) => text.split(' ').map((w) => word(w, confidence));

describe('buildPageText', () => {
  it('when every word is confident, should keep all lines in order', () => {
    const lines: OcrLines = [line('Violência e agressividade são sinônimos'), line('Será que são')];

    const result = buildPageText(lines);

    expect(result.lines).toEqual(['Violência e agressividade são sinônimos', 'Será que são']);
    expect(result.words).toBe(8);
    expect(result.keptWords).toBe(8);
    expect(result.confidence).toBe(95);
  });

  it('when a page mixes real text with photo noise, should keep only the confident words', () => {
    const lines: OcrLines = [
      line('Melhore esta Webaula'),
      [word('Caieiras'), word('é', 50), word('um', 40), word('bairro'), word('antigo')],
      [word('¥', 30), word('|', 20)],
    ];

    const result = buildPageText(lines);

    expect(result.lines).toEqual(['Melhore esta Webaula', 'Caieiras bairro antigo']);
    expect(result.words).toBe(10);
    expect(result.keptWords).toBe(6);
  });

  it(`when words are below ${MIN_WORD_CONFIDENCE} confidence, should drop them`, () => {
    const result = buildPageText([line('texto confiável aqui mesmo'), line('lixo ruído', 69)]);

    expect(result.lines).toEqual(['texto confiável aqui mesmo']);
  });

  it('when little meaningful text remains (a cover photo), should discard the whole page', () => {
    const lines: OcrLines = [[word('1'), word('—'), word('MA'), word('Webaula'), word('1')]];

    expect(buildPageText(lines)).toEqual({ lines: [], words: 5, keptWords: 0, confidence: 0 });
  });

  it('when the engine read nothing, should return an empty page', () => {
    expect(buildPageText([])).toEqual({ lines: [], words: 0, keptWords: 0, confidence: 0 });
  });

  it('when words are only symbols, should not count them as text', () => {
    const result = buildPageText([line('--- *** === |||'), line('um dois três quatro cinco')]);

    expect(result.lines).toEqual(['um dois três quatro cinco']);
  });

  it('when confidence varies, should average the kept words rounded', () => {
    const result = buildPageText([
      [word('alpha', 90), word('beta', 80), word('gamma', 71), word('delta', 100)],
    ]);

    expect(result.confidence).toBe(85);
  });
});
