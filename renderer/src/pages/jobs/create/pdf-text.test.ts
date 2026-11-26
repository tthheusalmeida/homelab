import { describe, expect, it } from 'vitest';

import { PdfStrings, readProgressText } from './pdf-text';

describe('PdfStrings.sendsTo', () => {
  it('when the provider is Ollama, should say the text stays on the computer', () => {
    expect(PdfStrings.sendsTo('ollama')).toMatch(/no seu computador/);
  });

  it('when the provider is Gemini, should warn that the text goes to an external service', () => {
    expect(PdfStrings.sendsTo('gemini')).toMatch(/enviado ao Gemini, um serviço externo/);
  });

  it('when the provider is Anthropic, should warn that the text goes to an external service', () => {
    expect(PdfStrings.sendsTo('anthropic')).toMatch(/enviado à Anthropic, um serviço externo/);
  });

  it('when no provider is chosen, should ask to choose one', () => {
    expect(PdfStrings.sendsTo(undefined)).toMatch(/Escolha o serviço de IA/);
  });
});

describe('readProgressText', () => {
  it('when nothing was reported yet, should say the pdf is being read', () => {
    expect(readProgressText(null)).toBe('Lendo o PDF…');
  });

  it('when reading the text of the pages, should show the page count', () => {
    expect(readProgressText({ done: 3, total: 10, stage: 'text' })).toBe('Lendo página 3 de 10');
  });

  it('when the file is only being opened, should say so', () => {
    expect(readProgressText({ done: 0, total: 0, stage: 'text' })).toBe('Abrindo o arquivo…');
  });

  it('when finding the language, should say so', () => {
    expect(readProgressText({ done: 0, total: 0, stage: 'language' })).toMatch(/idioma/);
  });

  it('when downloading the language data, should say it happens only the first time', () => {
    expect(readProgressText({ done: 0, total: 0, stage: 'download' })).toMatch(/primeira vez/);
  });

  it('when recognizing pages, should show the page count of the scanned pages', () => {
    expect(readProgressText({ done: 4, total: 9, stage: 'recognize' })).toMatch(/página 4 de 9/);
  });

  it('when recognition has not counted yet, should say it is preparing', () => {
    expect(readProgressText({ done: 0, total: 0, stage: 'recognize' })).toMatch(/Preparando/);
  });
});
