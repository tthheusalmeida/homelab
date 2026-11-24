const generateContent = jest.fn();
const list = jest.fn();
const get = jest.fn();

jest.mock('@google/genai', () => ({
  GoogleGenAI: jest.fn().mockImplementation(() => ({
    models: { generateContent, list, get },
  })),
}));

import { IpcError } from '../../../../../shared/errors';
import type { BackConfig } from '../../../../config/back-config';
import { GEMINI_NOT_CONFIGURED, GeminiProvider } from './gemini.provider';
import { cheapestModel, geminiCatalog } from './gemini.pricing';
import { AiUsageService } from '../../usage/ai-usage.service';

async function* asyncList<T>(items: T[]) {
  for (const item of items) {
    yield item;
  }
}

describe('GeminiProvider', () => {
  let usage: AiUsageService;

  const sleep = jest.fn().mockResolvedValue(undefined);

  const build = (geminiApiKey: string | null = 'test-key') => {
    const provider = new GeminiProvider(usage, {
      apiKeyFor: () => geminiApiKey,
    } as unknown as BackConfig);

    provider.sleep = sleep;

    return provider;
  };

  const apiError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

  beforeEach(() => {
    usage = new AiUsageService();
    generateContent.mockReset();
    sleep.mockClear();
    list.mockReset();
    get.mockReset();
  });

  describe('without an API key', () => {
    it('when there is no key, should still build so the app opens normally', () => {
      expect(() => build(null)).not.toThrow();
    });

    it('when there is no key, health should report error without calling the SDK', async () => {
      await expect(build(null).health()).resolves.toMatchObject({
        service: 'gemini',
        status: 'error',
      });
      expect(list).not.toHaveBeenCalled();
    });

    it.each(['chat', 'models', 'thinking'] as const)(
      'when there is no key, %s should reject NOT_CONFIGURED pointing to the settings',
      async (method) => {
        const provider = build(null);
        const call =
          method === 'chat'
            ? provider.chat({ message: 'oi', model: 'm' })
            : method === 'models'
              ? provider.models()
              : provider.thinking('m');

        const error = await call.catch((e: IpcError) => e);

        expect(error).toBeInstanceOf(IpcError);
        expect(error).toMatchObject({
          code: 'NOT_CONFIGURED',
          message: GEMINI_NOT_CONFIGURED,
        });
        expect(generateContent).not.toHaveBeenCalled();
      },
    );

    it('when there is a blank key, should be treated as not configured', async () => {
      await expect(build('').models()).rejects.toMatchObject({ code: 'NOT_CONFIGURED' });
    });
  });

  describe('health', () => {
    it('when models.list works, should report ok', async () => {
      list.mockResolvedValue([]);

      await expect(build().health()).resolves.toMatchObject({
        service: 'gemini',
        status: 'ok',
      });
    });

    it('when models.list fails, should report error', async () => {
      list.mockRejectedValue(new Error('x'));

      await expect(build().health()).resolves.toMatchObject({
        status: 'error',
      });
    });
  });

  describe('chat', () => {
    it('when the answer must be JSON, should turn on the Gemini JSON response mode', async () => {
      generateContent.mockResolvedValue({ text: '{}', usageMetadata: {} });

      await build().chat({ message: 'oi', model: 'gemini-3.5-flash', json: true });

      expect(generateContent).toHaveBeenCalledWith(
        expect.objectContaining({ config: { responseMimeType: 'application/json' } }),
      );
    });

    it('when the answer is plain text, should not send any response config', async () => {
      generateContent.mockResolvedValue({ text: 'oi', usageMetadata: {} });

      await build().chat({ message: 'oi', model: 'gemini-3.5-flash' });

      expect(generateContent.mock.calls[0][0]).not.toHaveProperty('config');
    });

    it('when chat succeeds, should strip the models/ prefix, return text and record usage with cost', async () => {
      generateContent.mockResolvedValue({
        text: 'resp',
        usageMetadata: {
          promptTokenCount: 1_000_000,
          candidatesTokenCount: 1_000_000,
          totalTokenCount: 2_000_000,
        },
      });

      const text = await build().chat({
        message: 'oi',
        model: 'models/gemini-3.5-flash',
      });

      expect(text).toBe('resp');
      expect(generateContent).toHaveBeenCalledWith({
        model: 'gemini-3.5-flash',
        contents: 'oi',
      });

      // 1M entrada * 0.75 + 1M saída * 4.5
      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        provider: 'gemini',
        model: 'gemini-3.5-flash',
        totalTokens: 2_000_000,
        estimatedCost: 5.25,
        success: true,
      });
    });

    it('when the whole conversation is sent, should map the turns to user and model roles in order', async () => {
      generateContent.mockResolvedValue({ text: 'r2' });

      await build().chat({
        message: 'p2',
        model: 'gemini-3.5-flash',
        messages: [
          { role: 'user', content: 'p1' },
          { role: 'assistant', content: 'r1' },
          { role: 'user', content: 'p2' },
        ] as never,
      });

      expect(generateContent).toHaveBeenCalledWith({
        model: 'gemini-3.5-flash',
        contents: [
          { role: 'user', parts: [{ text: 'p1' }] },
          { role: 'model', parts: [{ text: 'r1' }] },
          { role: 'user', parts: [{ text: 'p2' }] },
        ],
      });
    });

    it('when the model has no registered price, should have cost 0', async () => {
      generateContent.mockResolvedValue({
        text: 'r',
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 10 },
      });

      await build().chat({ message: 'a', model: 'desconhecido' });

      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        estimatedCost: 0,
        totalTokens: 20,
      });
    });

    it('when the response keeps coming empty, should try 3 times, record a single failure and explain', async () => {
      generateContent.mockResolvedValue({ text: '' });

      await expect(build().chat({ message: 'a', model: 'm' })).rejects.toThrow(
        'O Gemini devolveu uma resposta vazia.',
      );

      expect(generateContent).toHaveBeenCalledTimes(3);
      const { recentRequests } = usage.getUsage();
      expect(recentRequests).toHaveLength(1);
      expect(recentRequests[0].success).toBe(false);
    });

    it('when the API fails with an unknown error, should not retry, record a failure and throw the generic message', async () => {
      generateContent.mockRejectedValue(new Error('api'));

      await expect(build().chat({ message: 'a', model: 'm' })).rejects.toThrow(
        'chat do Gemini falhou',
      );

      expect(generateContent).toHaveBeenCalledTimes(1);
      expect(usage.getUsage().recentRequests[0].success).toBe(false);
    });

    it('when the API fails, should keep the reason the user sees in the recorded failure', async () => {
      generateContent.mockRejectedValue(new Error('api'));

      await expect(build().chat({ message: 'a', model: 'm' })).rejects.toThrow();

      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        success: false,
        error: expect.stringContaining('chat do Gemini falhou'),
      });
    });

    it('when there is no key, chat should record the failure so it shows in the usage', async () => {
      await expect(build(null).chat({ message: 'a', model: 'm' })).rejects.toMatchObject({
        code: 'NOT_CONFIGURED',
      });

      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        provider: 'gemini',
        success: false,
        error: GEMINI_NOT_CONFIGURED,
        totalTokens: 0,
      });
    });

    it('when the first call is overloaded (503) and the second works, should return the text without failing', async () => {
      generateContent.mockRejectedValueOnce(apiError(503)).mockResolvedValueOnce({ text: 'resp' });

      await expect(build().chat({ message: 'a', model: 'm' })).resolves.toBe('resp');

      expect(generateContent).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledTimes(1);
      expect(usage.getUsage().recentRequests).toHaveLength(1);
      expect(usage.getUsage().recentRequests[0].success).toBe(true);
    });

    it('when the limit is reached (429) on every attempt, should try 3 times and explain the limit', async () => {
      generateContent.mockRejectedValue(apiError(429));

      await expect(build().chat({ message: 'a', model: 'm' })).rejects.toThrow(
        'O limite de uso do Gemini foi atingido',
      );

      expect(generateContent).toHaveBeenCalledTimes(3);
      expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([3000, 8000]);
    });

    it('when it retries, should tell the caller each new attempt with the reason', async () => {
      generateContent
        .mockRejectedValueOnce(apiError(503))
        .mockRejectedValueOnce(apiError(429))
        .mockResolvedValueOnce({ text: 'resp' });
      const onRetry = jest.fn();

      await build().chat({ message: 'a', model: 'm', onRetry });

      expect(onRetry).toHaveBeenNthCalledWith(1, {
        attempt: 2,
        maxAttempts: 3,
        delayMs: 3000,
        reason: 'O Gemini está sobrecarregado ou indisponível no momento.',
      });
      expect(onRetry).toHaveBeenNthCalledWith(2, {
        attempt: 3,
        maxAttempts: 3,
        delayMs: 8000,
        reason: 'O limite de uso do Gemini foi atingido. Aguarde um pouco ou escolha outro modelo.',
      });
    });

    describe('fallback to the cheapest model', () => {
      const chosen = 'gemini-4-neon';

      it('when a priced model stays overloaded, should switch to the cheapest one, warn and record it', async () => {
        generateContent
          .mockRejectedValueOnce(apiError(503))
          .mockRejectedValueOnce(apiError(503))
          .mockRejectedValueOnce(apiError(503))
          .mockResolvedValueOnce({ text: 'resp' });
        const onRetry = jest.fn();

        await expect(build().chat({ message: 'a', model: chosen, onRetry })).resolves.toBe('resp');

        expect(generateContent).toHaveBeenCalledTimes(4);
        expect(generateContent.mock.calls[3][0].model).toBe(cheapestModel());
        expect(onRetry).toHaveBeenCalledWith(
          expect.objectContaining({
            fallback: true,
            reason: 'O Gemini está sobrecarregado ou indisponível no momento.',
          }),
        );
        expect(usage.getUsage().recentRequests[0].model).toBe(cheapestModel());
      });

      it('when the cheapest model is already the chosen one, should not switch', async () => {
        generateContent.mockRejectedValue(apiError(503));

        await expect(build().chat({ message: 'a', model: cheapestModel() })).rejects.toThrow(
          'sobrecarregado',
        );

        expect(generateContent).toHaveBeenCalledTimes(3);
      });

      it('when the error is not passing (key refused), should not switch', async () => {
        generateContent.mockRejectedValue(apiError(401));

        await expect(build().chat({ message: 'a', model: chosen })).rejects.toThrow(
          'recusou a chave',
        );

        expect(generateContent).toHaveBeenCalledTimes(1);
      });

      it('when the cheapest model also fails, should explain the failure and record one failure', async () => {
        generateContent.mockRejectedValue(apiError(503));

        await expect(build().chat({ message: 'a', model: chosen })).rejects.toThrow(
          'sobrecarregado',
        );

        expect(generateContent).toHaveBeenCalledTimes(6);
        expect(usage.getUsage().recentRequests).toHaveLength(1);
      });

      it('when the user cancelled, should not switch', async () => {
        const controller = new AbortController();

        generateContent.mockImplementation(() => {
          controller.abort();

          return Promise.reject(apiError(503));
        });

        await expect(
          build().chat({ message: 'a', model: chosen, signal: controller.signal }),
        ).rejects.toThrow();

        expect(generateContent).toHaveBeenCalledTimes(1);
      });
    });

    it.each([
      [401, 'recusou a chave'],
      [403, 'recusou a chave'],
      [404, 'modelo escolhido não está disponível'],
      [400, 'não aceitou o pedido'],
    ])('when the API answers %s, should not retry and explain', async (status, text) => {
      generateContent.mockRejectedValue(apiError(status));

      await expect(build().chat({ message: 'a', model: 'm' })).rejects.toThrow(text);

      expect(generateContent).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });

    it('when the connection drops once, should retry and work', async () => {
      generateContent
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce({ text: 'resp' });

      await expect(build().chat({ message: 'a', model: 'm' })).resolves.toBe('resp');
    });

    it('when the final error is thrown, should keep the original one in the cause', async () => {
      const original = apiError(503);
      generateContent.mockRejectedValue(original);

      const error = await build()
        .chat({ message: 'a', model: 'm' })
        .catch((e: Error) => e);

      expect((error as Error).cause).toBe(original);
    });
  });

  describe('cheapestModel', () => {
    it('when asked, should answer the cheapest model of its catalog', () => {
      expect(build().cheapestModel()).toBe(geminiCatalog.cheapest());
    });
  });

  describe('models', () => {
    it('when models are listed, should keep only priced models, normalized and ordered by cost', async () => {
      list.mockResolvedValue(
        asyncList([
          {
            name: 'models/gemini-3.5-flash',
            inputTokenLimit: 1000,
            supportedActions: ['generateContent'],
          },
          { name: 'models/nao-cadastrado' },
          { name: 'models/gemini-3.1-flash-lite' },
          { name: 'models/gemini-4-neon' },
          { name: 'models/gemini-3.6-flash' },
        ]),
      );

      const result = await build().models();

      expect(result.map((m) => m.name)).toEqual([
        'gemini-3.1-flash-lite',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-4-neon',
      ]);
      expect(result[2]).toMatchObject({
        provider: 'gemini',
        details: { context_length: 1000 },
        capabilities: ['generateContent'],
      });
    });

    it('when listing models fails, should throw', async () => {
      list.mockRejectedValue(new Error('x'));

      await expect(build().models()).rejects.toThrow('listar modelos');
    });
  });

  describe('thinking', () => {
    it('when the model supports thinking, should return off and on options', async () => {
      get.mockResolvedValue({ thinking: true });

      await expect(build().thinking('models/m')).resolves.toEqual([
        { id: 'off', label: 'Desativado' },
        { id: 'on', label: 'Ativado' },
      ]);
      expect(get).toHaveBeenCalledWith({ model: 'm' });
    });

    it('when the model does not support thinking, should return an empty list', async () => {
      get.mockResolvedValue({ thinking: false });

      await expect(build().thinking('m')).resolves.toEqual([]);
    });

    it('when the API fails, should throw an error naming the model', async () => {
      get.mockRejectedValue(new Error('x'));

      await expect(build().thinking('abc')).rejects.toThrow('abc');
    });
  });
});
