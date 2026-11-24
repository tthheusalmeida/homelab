import { EXTERNAL_PROVIDER_IDS } from '../shared/contracts/providers';

import { readApiKeys } from './api-keys';

describe('readApiKeys', () => {
  it('when reading the keys, should ask the store for <id>.apiKey of every external provider', async () => {
    const get = jest.fn().mockResolvedValue(null);

    await readApiKeys({ get });

    expect(get.mock.calls.map(([key]) => key)).toEqual(
      EXTERNAL_PROVIDER_IDS.map((id) => `${id}.apiKey`),
    );
  });

  it('when only some providers have a key, should map each id to its own key or null', async () => {
    const get = jest.fn(async (key: string) => (key === 'anthropic.apiKey' ? 'sk-ant-1' : null));

    await expect(readApiKeys({ get })).resolves.toEqual({
      gemini: null,
      anthropic: 'sk-ant-1',
      groq: null,
    });
  });
});
