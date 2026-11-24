import { createGroqDefinition } from './groq.definition';

describe('createGroqDefinition', () => {
  it('when the key check passes, should answer ok', async () => {
    const definition = createGroqDefinition(() => Promise.resolve());

    await expect(definition.test('k')).resolves.toEqual({
      ok: true,
      message: 'Conexão com a Groq funcionando.',
    });
  });

  it('when the key check fails, should answer not ok with the reason', async () => {
    const definition = createGroqDefinition(() => Promise.reject(new Error('Invalid API Key')));

    await expect(definition.test('k')).resolves.toEqual({
      ok: false,
      message: 'Falha ao conectar à Groq: Invalid API Key',
    });
  });

  it('when describing the provider, should use the groq id and secret key', () => {
    const definition = createGroqDefinition(() => Promise.resolve());

    expect(definition).toMatchObject({ id: 'groq', label: 'Groq', secretKey: 'groq.apiKey' });
  });
});
