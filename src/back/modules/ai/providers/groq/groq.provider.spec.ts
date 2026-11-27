const create = jest.fn((..._args: unknown[]) => Promise.resolve({}));
const list = jest.fn();

jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create } },
    models: { list },
  })),
}));

import { IpcError } from '../../../../../shared/errors';
import type { BackConfig } from '../../../../config/back-config';
import { AiUsageService } from '../../usage/ai-usage.service';
import { groqCatalog } from './groq.pricing';
import { GROQ_NOT_CONFIGURED, GroqProvider } from './groq.provider';

const answer = (text: string | null, promptTokens = 10, completionTokens = 20) => ({
  choices: [{ message: { content: text } }],
  usage: {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  },
});

const firstArg = (call: number) => create.mock.calls[call][0] as Record<string, unknown>;

describe('GroqProvider', () => {
  let usage: AiUsageService;

  const sleep = jest.fn().mockResolvedValue(undefined);
  const cheapest = groqCatalog.cheapest();

  const build = (apiKey: string | null = 'test-key') => {
    const provider = new GroqProvider(usage, {
      apiKeyFor: () => apiKey,
    } as unknown as BackConfig);

    provider.sleep = sleep;

    return provider;
  };

  const apiError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

  beforeEach(() => {
    usage = new AiUsageService();
    create.mockReset();
    list.mockReset();
    sleep.mockClear();
  });

  describe('without an API key', () => {
    it('when there is no key, health should report error without calling the API', async () => {
      await expect(build(null).health()).resolves.toMatchObject({
        service: 'groq',
        status: 'error',
      });
      expect(list).not.toHaveBeenCalled();
    });

    it('when there is no key, chat should throw NOT_CONFIGURED and record the failure', async () => {
      const call = build(null).chat({ message: 'a', model: cheapest });

      await expect(call).rejects.toBeInstanceOf(IpcError);
      await expect(call).rejects.toThrow(GROQ_NOT_CONFIGURED);
      expect(usage.getUsage().recentRequests[0].success).toBe(false);
    });

    it('when there is no key, models should throw NOT_CONFIGURED', async () => {
      await expect(build(null).models()).rejects.toThrow(GROQ_NOT_CONFIGURED);
    });
  });

  describe('health', () => {
    it('when models.list works, should report ok', async () => {
      list.mockResolvedValue({ data: [] });

      await expect(build().health()).resolves.toMatchObject({ status: 'ok' });
    });

    it('when models.list fails, should report error', async () => {
      list.mockRejectedValue(new Error('x'));

      await expect(build().health()).resolves.toMatchObject({ status: 'error' });
    });
  });

  describe('chat', () => {
    it('when chat succeeds, should return the text and record usage with cost', async () => {
      create.mockResolvedValue(answer('resp', 1_000_000, 1_000_000));

      await expect(build().chat({ message: 'oi', model: 'openai/gpt-oss-120b' })).resolves.toBe(
        'resp',
      );

      expect(firstArg(0)).toMatchObject({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'user', content: 'oi' }],
      });
      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        provider: 'groq',
        model: 'openai/gpt-oss-120b',
        success: true,
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        estimatedCost: 0.75,
      });
    });

    it('when the whole conversation is sent, should keep the turns in order', async () => {
      create.mockResolvedValue(answer('ok'));

      await build().chat({
        message: 'ignorada',
        model: cheapest,
        messages: [
          { role: 'user', content: 'a' },
          { role: 'assistant', content: 'b' },
          { role: 'user', content: 'c' },
        ],
      });

      expect(firstArg(0).messages).toEqual([
        { role: 'user', content: 'a' },
        { role: 'assistant', content: 'b' },
        { role: 'user', content: 'c' },
      ]);
    });

    it('when the answer must be JSON, should use JSON mode with a system instruction', async () => {
      create.mockResolvedValue(answer('{}'));

      await build().chat({ message: 'a', model: cheapest, json: true });

      expect(firstArg(0).response_format).toEqual({ type: 'json_object' });
      expect(firstArg(0).messages).toEqual([
        { role: 'system', content: expect.stringContaining('JSON') },
        { role: 'user', content: 'a' },
      ]);
    });

    it('when the answer is plain text, should not send JSON mode or a system message', async () => {
      create.mockResolvedValue(answer('x'));

      await build().chat({ message: 'a', model: cheapest });

      expect(firstArg(0)).not.toHaveProperty('response_format');
      expect(firstArg(0).messages).toEqual([{ role: 'user', content: 'a' }]);
    });

    it('when there is a signal, should pass it to the SDK', async () => {
      create.mockResolvedValue(answer('x'));
      const controller = new AbortController();

      await build().chat({ message: 'a', model: cheapest, signal: controller.signal });

      expect(create.mock.calls[0][1]).toEqual({ signal: controller.signal });
    });

    it('when the response has no usage, should count 0 tokens', async () => {
      create.mockResolvedValue({ choices: [{ message: { content: 'x' } }] });

      await build().chat({ message: 'a', model: cheapest });

      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        inputTokens: 0,
        outputTokens: 0,
      });
    });

    it('when the response keeps coming empty, should try 3 times and record a single failure', async () => {
      create.mockResolvedValue(answer(null));

      await expect(build().chat({ message: 'a', model: cheapest })).rejects.toThrow(
        'A Groq devolveu uma resposta vazia.',
      );

      expect(create).toHaveBeenCalledTimes(3);
      expect(usage.getUsage().recentRequests).toHaveLength(1);
    });

    it('when the first call hits the limit (429) and the second works, should return the text', async () => {
      create.mockRejectedValueOnce(apiError(429)).mockResolvedValueOnce(answer('resp'));

      await expect(build().chat({ message: 'a', model: cheapest })).resolves.toBe('resp');

      expect(create).toHaveBeenCalledTimes(2);
    });

    it('when it retries, should tell the caller each new attempt with the reason', async () => {
      create.mockRejectedValueOnce(apiError(503)).mockResolvedValueOnce(answer('resp'));
      const onRetry = jest.fn();

      await build().chat({ message: 'a', model: cheapest, onRetry });

      expect(onRetry).toHaveBeenCalledWith({
        attempt: 2,
        maxAttempts: 3,
        delayMs: 3000,
        reason: 'A Groq está sobrecarregada ou indisponível no momento.',
      });
    });

    it('when the key is refused (401), should not retry and explain', async () => {
      create.mockRejectedValue(apiError(401));

      await expect(build().chat({ message: 'a', model: cheapest })).rejects.toThrow(
        'recusou a chave',
      );

      expect(create).toHaveBeenCalledTimes(1);
    });

    it('when a pricier model stays overloaded, should switch to the cheapest and warn', async () => {
      create
        .mockRejectedValueOnce(apiError(503))
        .mockRejectedValueOnce(apiError(503))
        .mockRejectedValueOnce(apiError(503))
        .mockResolvedValueOnce(answer('resp'));
      const onRetry = jest.fn();

      await expect(
        build().chat({ message: 'a', model: 'openai/gpt-oss-120b', onRetry }),
      ).resolves.toBe('resp');

      expect(create).toHaveBeenCalledTimes(4);
      expect(firstArg(3).model).toBe(cheapest);
      expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ fallback: true }));
    });
  });

  describe('cheapestModel', () => {
    it('when asked, should answer the cheapest model of its catalog', () => {
      expect(build().cheapestModel()).toBe(cheapest);
    });
  });

  describe('models', () => {
    it('when models are listed, should keep only priced models ordered by cost', async () => {
      list.mockResolvedValue({
        data: [
          { id: 'qwen/qwen3.8-27b', owned_by: 'Alibaba Cloud' },
          { id: 'whisper-large-v3', owned_by: 'OpenAI' },
          { id: 'openai/gpt-oss-20b', owned_by: 'OpenAI' },
          { id: 'openai/gpt-oss-120b', owned_by: 'OpenAI' },
        ],
      });

      const result = await build().models();

      expect(result.map((model) => model.name)).toEqual([
        'openai/gpt-oss-20b',
        'openai/gpt-oss-120b',
        'qwen/qwen3.8-27b',
      ]);
      expect(result[0]).toMatchObject({ provider: 'groq', model: 'openai/gpt-oss-20b' });
    });

    it('when listing models fails, should throw', async () => {
      list.mockRejectedValue(new Error('x'));

      await expect(build().models()).rejects.toThrow(
        'A requisição para listar modelos da Groq falhou.',
      );
    });
  });

  describe('thinking', () => {
    it('when asked, should offer no options', async () => {
      await expect(build().thinking()).resolves.toEqual([]);
    });
  });

  describe('resposta aos pedaços', () => {
    async function* fluxo() {
      yield { choices: [{ delta: { content: 'Olá, ' } }] };
      yield { choices: [{ delta: { content: 'mundo' } }] };
      yield {
        choices: [{ delta: {} }],
        x_groq: { usage: { prompt_tokens: 4, completion_tokens: 6, total_tokens: 10 } },
      };
    }

    it('when the caller wants the pieces, should stream, hand them over and record usage from the last chunk', async () => {
      create.mockResolvedValue(fluxo());
      const pieces: string[] = [];

      const text = await build().chat({
        message: 'oi',
        model: cheapest,
        onChunk: (piece) => pieces.push(piece),
      });

      expect(text).toBe('Olá, mundo');
      expect(pieces).toEqual(['Olá, ', 'mundo']);
      expect(firstArg(0)).toMatchObject({ stream: true });
      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        inputTokens: 4,
        outputTokens: 6,
        success: true,
      });
    });

    it('when the stream brings no text, should fail as an empty answer', async () => {
      async function* vazio() {
        yield { choices: [{ delta: {} }] };
      }

      create.mockResolvedValue(vazio());

      await expect(
        build().chat({ message: 'oi', model: cheapest, onChunk: () => undefined }),
      ).rejects.toThrow();
    });
  });
});
