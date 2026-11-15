import { createGeminiProvider, MissingKeyGeminiProvider } from './gemini-provider-factory';

describe('MissingKeyGeminiProvider', () => {
  const provider = new MissingKeyGeminiProvider();

  it('when checking health, should answer error status for the gemini service', async () => {
    await expect(provider.health()).resolves.toEqual({
      service: 'gemini',
      description: 'Google Gemini API',
      status: 'error',
    });
  });

  it.each(['chat', 'models', 'thinking'] as const)(
    'when calling %s, should reject with NOT_CONFIGURED and a message pointing to Configurações',
    async (method) => {
      await expect(provider[method]()).rejects.toMatchObject({
        code: 'NOT_CONFIGURED',
        message: expect.stringContaining('Configurações') as unknown,
      });
    },
  );

  it('when asked its name, should be gemini', () => {
    expect(provider.name).toBe('gemini');
  });
});

describe('createGeminiProvider', () => {
  it('when there is no key, should return the missing-key provider without building the real one', () => {
    const providerClass = jest.fn();

    const result = createGeminiProvider({
      apiKey: null,
      providerClass: providerClass as never,
      usage: {},
      env: {},
    });

    expect(result).toBeInstanceOf(MissingKeyGeminiProvider);
    expect(providerClass).not.toHaveBeenCalled();
  });

  it('when there is a key, should expose it to the real provider only while it is built', () => {
    const env: Record<string, string | undefined> = {};
    let seenDuringBuild: string | undefined;

    class Real {
      constructor(readonly usage: unknown) {
        seenDuringBuild = env.GEMINI_API_KEY;
      }
    }

    const result = createGeminiProvider({
      apiKey: 'AIza-x',
      providerClass: Real,
      usage: 'usage-service',
      env,
    });

    expect(result).toBeInstanceOf(Real);
    expect((result as Real).usage).toBe('usage-service');
    expect(seenDuringBuild).toBe('AIza-x');
    expect(env.GEMINI_API_KEY).toBeUndefined();
  });

  it('when the real provider throws while building, should still remove the key from the env', () => {
    const env: Record<string, string | undefined> = {};

    class Broken {
      constructor() {
        throw new Error('falhou');
      }
    }

    expect(() =>
      createGeminiProvider({ apiKey: 'AIza-x', providerClass: Broken, usage: {}, env }),
    ).toThrow('falhou');
    expect(env.GEMINI_API_KEY).toBeUndefined();
  });
});
