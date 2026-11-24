import { EXTERNAL_PROVIDER_IDS } from '../shared/contracts/providers';

import { createExternalDefinitions } from './external-definitions';

describe('createExternalDefinitions', () => {
  it('when creating the definitions, should have one per external provider id, in order', () => {
    expect(createExternalDefinitions().map((definition) => definition.id)).toEqual([
      ...EXTERNAL_PROVIDER_IDS,
    ]);
  });

  it('when a checker is given for a provider, should use it for that provider only', async () => {
    const gemini = jest.fn().mockResolvedValue(undefined);
    const anthropic = jest.fn().mockRejectedValue(new Error('recusada'));
    const [first, second] = createExternalDefinitions({ gemini, anthropic });

    await expect(first.test('k')).resolves.toMatchObject({ ok: true });
    await expect(second.test('k')).resolves.toMatchObject({ ok: false });
    expect(gemini).toHaveBeenCalledWith('k');
    expect(anthropic).toHaveBeenCalledWith('k');
  });

  it('when each definition is created, should store its key under <id>.apiKey', () => {
    for (const definition of createExternalDefinitions()) {
      expect(definition.secretKey).toBe(`${definition.id}.apiKey`);
    }
  });
});
