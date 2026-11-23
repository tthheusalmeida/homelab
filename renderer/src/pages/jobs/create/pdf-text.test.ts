import { describe, expect, it } from 'vitest';

import { PdfStrings } from './pdf-text';

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
