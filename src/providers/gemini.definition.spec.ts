import { createGeminiDefinition, readableGeminiError } from './gemini.definition';

describe('readableGeminiError', () => {
  it('when the message is the SDK JSON body, should extract only the error text', () => {
    const body = JSON.stringify({ error: { code: 400, message: 'API key not valid.' } });

    expect(readableGeminiError(new Error(body))).toBe('API key not valid.');
  });

  it('when the message is plain text, should keep it', () => {
    expect(readableGeminiError(new Error('fetch failed'))).toBe('fetch failed');
  });

  it('when the JSON has no error message, should keep the original text', () => {
    expect(readableGeminiError(new Error('{"outra":"coisa"}'))).toBe('{"outra":"coisa"}');
  });

  it('when the value is not an Error, should stringify it', () => {
    expect(readableGeminiError('boom')).toBe('boom');
  });
});

describe('createGeminiDefinition', () => {
  it('when the key check passes, should answer ok', async () => {
    const definition = createGeminiDefinition(() => Promise.resolve());

    await expect(definition.test('k')).resolves.toEqual({
      ok: true,
      message: 'Conexão com o Gemini funcionando.',
    });
  });

  it('when the key check fails, should answer not ok with a readable reason', async () => {
    const body = JSON.stringify({ error: { message: 'API key not valid.' } });
    const definition = createGeminiDefinition(() => Promise.reject(new Error(body)));

    await expect(definition.test('k')).resolves.toEqual({
      ok: false,
      message: 'Falha ao conectar ao Gemini: API key not valid.',
    });
  });

  it('when describing the provider, should use the gemini secret', () => {
    const definition = createGeminiDefinition(() => Promise.resolve());

    expect(definition).toMatchObject({ id: 'gemini', secretKey: 'gemini.apiKey' });
  });
});
