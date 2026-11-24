import { createApiKeyDefinition } from './api-key-definition';

const build = (overrides: Partial<Parameters<typeof createApiKeyDefinition>[0]> = {}) =>
  createApiKeyDefinition({
    id: 'gemini',
    label: 'Gemini',
    secretKey: 'gemini.apiKey',
    checkKey: () => Promise.resolve(),
    okMessage: 'ok!',
    failedMessage: (reason) => `falhou: ${reason}`,
    ...overrides,
  });

describe('createApiKeyDefinition', () => {
  it('when describing the provider, should carry the id, label and secret key', () => {
    expect(build()).toMatchObject({ id: 'gemini', label: 'Gemini', secretKey: 'gemini.apiKey' });
  });

  it('when the key check passes, should answer ok with the ok message', async () => {
    await expect(build().test('k')).resolves.toEqual({ ok: true, message: 'ok!' });
  });

  it('when the check receives the key, should pass it on', async () => {
    const checkKey = jest.fn().mockResolvedValue(undefined);

    await build({ checkKey }).test('abc');

    expect(checkKey).toHaveBeenCalledWith('abc');
  });

  it('when the key check fails, should answer not ok with the error message', async () => {
    const definition = build({ checkKey: () => Promise.reject(new Error('boom')) });

    await expect(definition.test('k')).resolves.toEqual({ ok: false, message: 'falhou: boom' });
  });

  it('when the check rejects with a non-Error, should stringify it', async () => {
    const definition = build({ checkKey: () => Promise.reject('texto' as unknown as Error) });

    await expect(definition.test('k')).resolves.toEqual({ ok: false, message: 'falhou: texto' });
  });

  it('when a custom error reader is given, should use it for the reason', async () => {
    const definition = build({
      checkKey: () => Promise.reject(new Error('{"x":1}')),
      readError: () => 'motivo limpo',
    });

    await expect(definition.test('k')).resolves.toEqual({
      ok: false,
      message: 'falhou: motivo limpo',
    });
  });
});
