import { createAnthropicDefinition } from './anthropic.definition';

describe('createAnthropicDefinition', () => {
  it('when the key check passes, should answer ok', async () => {
    const definition = createAnthropicDefinition(() => Promise.resolve());

    await expect(definition.test('k')).resolves.toEqual({
      ok: true,
      message: 'Conexão com a Anthropic funcionando.',
    });
  });

  it('when the key check fails, should answer not ok with the reason', async () => {
    const definition = createAnthropicDefinition(() =>
      Promise.reject(new Error('invalid x-api-key')),
    );

    await expect(definition.test('k')).resolves.toEqual({
      ok: false,
      message: 'Falha ao conectar à Anthropic: invalid x-api-key',
    });
  });

  it('when the check rejects with a non-Error, should stringify it', async () => {
    const definition = createAnthropicDefinition(() => Promise.reject('boom' as unknown as Error));

    await expect(definition.test('k')).resolves.toMatchObject({ ok: false });
  });

  it('when describing the provider, should use the anthropic id and secret key', () => {
    const definition = createAnthropicDefinition(() => Promise.resolve());

    expect(definition).toMatchObject({
      id: 'anthropic',
      label: 'Anthropic',
      secretKey: 'anthropic.apiKey',
    });
  });
});
