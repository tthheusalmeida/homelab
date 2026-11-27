const finalMessage = jest.fn();
const on = jest.fn();
const stream = jest.fn((..._args: unknown[]) => ({ finalMessage, on }));
const list = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { stream },
    models: { list },
  })),
}));

import { IpcError } from '../../../../../shared/errors';
import type { BackConfig } from '../../../../config/back-config';
import { AiUsageService } from '../../usage/ai-usage.service';
import { cheapestAnthropicModel } from './anthropic.pricing';
import { ANTHROPIC_NOT_CONFIGURED, AnthropicProvider } from './anthropic.provider';

async function* asyncList<T>(items: T[]) {
  for (const item of items) {
    yield item;
  }
}

const answer = (text: string, inputTokens = 10, outputTokens = 20) => ({
  stop_reason: 'end_turn',
  content: [{ type: 'text', text }],
  usage: { input_tokens: inputTokens, output_tokens: outputTokens },
});

const firstArg = (call: number) => stream.mock.calls[call][0] as Record<string, unknown>;

describe('AnthropicProvider', () => {
  let usage: AiUsageService;

  const sleep = jest.fn().mockResolvedValue(undefined);

  const build = (anthropicApiKey: string | null = 'test-key') => {
    const provider = new AnthropicProvider(usage, {
      apiKeyFor: () => anthropicApiKey,
    } as unknown as BackConfig);

    provider.sleep = sleep;

    return provider;
  };

  const apiError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

  beforeEach(() => {
    usage = new AiUsageService();
    finalMessage.mockReset();
    stream.mockClear();
    list.mockReset();
    sleep.mockClear();
  });

  describe('without an API key', () => {
    it('when there is no key, should still build and health should report error', async () => {
      await expect(build(null).health()).resolves.toMatchObject({
        service: 'anthropic',
        status: 'error',
      });
      expect(list).not.toHaveBeenCalled();
    });

    it('when there is no key, chat should throw NOT_CONFIGURED and record the failure', async () => {
      const call = build(null).chat({ message: 'a', model: 'claude-haiku-5-5' });

      await expect(call).rejects.toBeInstanceOf(IpcError);
      await expect(call).rejects.toThrow(ANTHROPIC_NOT_CONFIGURED);
      expect(usage.getUsage().recentRequests[0].success).toBe(false);
    });

    it('when there is no key, models should throw NOT_CONFIGURED', async () => {
      await expect(build(null).models()).rejects.toThrow(ANTHROPIC_NOT_CONFIGURED);
    });
  });

  describe('health', () => {
    it('when models.list works, should report ok', async () => {
      list.mockResolvedValue(asyncList([]));

      await expect(build().health()).resolves.toMatchObject({ status: 'ok' });
    });

    it('when models.list fails, should report error', async () => {
      list.mockRejectedValue(new Error('x'));

      await expect(build().health()).resolves.toMatchObject({ status: 'error' });
    });
  });

  describe('chat', () => {
    it('when chat succeeds, should return the text and record usage with cost', async () => {
      finalMessage.mockResolvedValue(answer('resp', 1_000_000, 1_000_000));

      await expect(build().chat({ message: 'oi', model: 'claude-opus-5-5' })).resolves.toBe('resp');

      expect(firstArg(0)).toMatchObject({
        model: 'claude-opus-5-5',
        messages: [{ role: 'user', content: 'oi' }],
      });
      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        provider: 'anthropic',
        model: 'claude-opus-5-5',
        success: true,
        inputTokens: 1_000_000,
        outputTokens: 1_000_000,
        estimatedCost: 24,
      });
    });

    it('when the whole conversation is sent, should keep the turns in order', async () => {
      finalMessage.mockResolvedValue(answer('ok'));

      await build().chat({
        message: 'ignorada',
        model: 'claude-haiku-5-5',
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

    it('when the answer must be JSON, should ask for JSON only in the system prompt', async () => {
      finalMessage.mockResolvedValue(answer('{}'));

      await build().chat({ message: 'a', model: 'claude-haiku-5-5', json: true });

      expect(firstArg(0).system).toContain('JSON');
    });

    it('when the answer is plain text, should not send a system prompt', async () => {
      finalMessage.mockResolvedValue(answer('x'));

      await build().chat({ message: 'a', model: 'claude-haiku-5-5' });

      expect(firstArg(0)).not.toHaveProperty('system');
    });

    it('when there is a signal, should pass it to the SDK', async () => {
      finalMessage.mockResolvedValue(answer('x'));
      const controller = new AbortController();

      await build().chat({ message: 'a', model: 'claude-haiku-5-5', signal: controller.signal });

      expect(stream.mock.calls[0][1]).toEqual({ signal: controller.signal });
    });

    it('when the response has several text blocks, should join them', async () => {
      finalMessage.mockResolvedValue({
        stop_reason: 'end_turn',
        content: [
          { type: 'thinking', thinking: '' },
          { type: 'text', text: 'um ' },
          { type: 'text', text: 'dois' },
        ],
        usage: { input_tokens: 1, output_tokens: 1 },
      });

      await expect(build().chat({ message: 'a', model: 'claude-haiku-5-5' })).resolves.toBe(
        'um dois',
      );
    });

    it('when the model has no registered price, should have cost 0', async () => {
      finalMessage.mockResolvedValue(answer('x'));

      await build().chat({ message: 'a', model: 'm' });

      expect(usage.getUsage().recentRequests[0].estimatedCost).toBe(0);
    });

    it('when the Haiku 5.5 prompt is over 100 thousand tokens, should charge the high tier', async () => {
      finalMessage.mockResolvedValue(answer('x', 200_000, 0));

      await build().chat({ message: 'a', model: 'claude-haiku-5-5' });

      expect(usage.getUsage().recentRequests[0].estimatedCost).toBeCloseTo(0.1);
    });

    it('when the answer is a refusal, should not retry and explain', async () => {
      finalMessage.mockResolvedValue({ ...answer('x'), stop_reason: 'refusal' });

      await expect(build().chat({ message: 'a', model: 'm' })).rejects.toThrow(
        'A Anthropic recusou responder a este conteúdo.',
      );

      expect(stream).toHaveBeenCalledTimes(1);
    });

    it('when the response keeps coming empty, should try 3 times and record a single failure', async () => {
      finalMessage.mockResolvedValue({ ...answer(''), content: [] });

      await expect(build().chat({ message: 'a', model: 'm' })).rejects.toThrow(
        'A Anthropic devolveu uma resposta vazia.',
      );

      expect(stream).toHaveBeenCalledTimes(3);
      expect(usage.getUsage().recentRequests).toHaveLength(1);
    });

    it('when the first call is overloaded (529) and the second works, should return the text', async () => {
      finalMessage.mockRejectedValueOnce(apiError(529)).mockResolvedValueOnce(answer('resp'));

      await expect(build().chat({ message: 'a', model: 'm' })).resolves.toBe('resp');

      expect(stream).toHaveBeenCalledTimes(2);
      expect(usage.getUsage().recentRequests[0].success).toBe(true);
    });

    it('when it retries, should tell the caller each new attempt with the reason', async () => {
      finalMessage.mockRejectedValueOnce(apiError(529)).mockResolvedValueOnce(answer('resp'));
      const onRetry = jest.fn();

      await build().chat({ message: 'a', model: 'm', onRetry });

      expect(onRetry).toHaveBeenCalledWith({
        attempt: 2,
        maxAttempts: 3,
        delayMs: 3000,
        reason: 'A Anthropic está sobrecarregada ou indisponível no momento.',
      });
    });

    it('when the key is refused (401), should not retry and explain', async () => {
      finalMessage.mockRejectedValue(apiError(401));

      await expect(build().chat({ message: 'a', model: 'claude-opus-5-5' })).rejects.toThrow(
        'recusou a chave',
      );

      expect(stream).toHaveBeenCalledTimes(1);
    });

    it('when the final error is thrown, should keep the original one in the cause', async () => {
      const original = apiError(401);

      finalMessage.mockRejectedValue(original);

      await expect(build().chat({ message: 'a', model: 'm' })).rejects.toMatchObject({
        cause: original,
      });
    });

    describe('fallback to the cheapest model', () => {
      const chosen = 'claude-opus-5-5';

      it('when a priced model stays overloaded, should switch to the cheapest, warn and record it', async () => {
        finalMessage
          .mockRejectedValueOnce(apiError(529))
          .mockRejectedValueOnce(apiError(529))
          .mockRejectedValueOnce(apiError(529))
          .mockResolvedValueOnce(answer('resp'));
        const onRetry = jest.fn();

        await expect(build().chat({ message: 'a', model: chosen, onRetry })).resolves.toBe('resp');

        expect(stream).toHaveBeenCalledTimes(4);
        expect(firstArg(3).model).toBe(cheapestAnthropicModel());
        expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ fallback: true }));
        expect(usage.getUsage().recentRequests[0].model).toBe(cheapestAnthropicModel());
      });

      it('when the cheapest model is already the chosen one, should not switch', async () => {
        finalMessage.mockRejectedValue(apiError(529));

        await expect(
          build().chat({ message: 'a', model: cheapestAnthropicModel() }),
        ).rejects.toThrow('sobrecarregada');

        expect(stream).toHaveBeenCalledTimes(3);
      });

      it('when the error is not passing (key refused), should not switch', async () => {
        finalMessage.mockRejectedValue(apiError(401));

        await expect(build().chat({ message: 'a', model: chosen })).rejects.toThrow();

        expect(stream).toHaveBeenCalledTimes(1);
      });

      it('when the cheapest model also fails, should explain and record one failure', async () => {
        finalMessage.mockRejectedValue(apiError(529));

        await expect(build().chat({ message: 'a', model: chosen })).rejects.toThrow(
          'sobrecarregada',
        );

        expect(stream).toHaveBeenCalledTimes(6);
        expect(usage.getUsage().recentRequests).toHaveLength(1);
      });

      it('when the user cancelled, should not switch', async () => {
        const controller = new AbortController();

        finalMessage.mockImplementation(() => {
          controller.abort();

          return Promise.reject(apiError(529));
        });

        await expect(
          build().chat({ message: 'a', model: chosen, signal: controller.signal }),
        ).rejects.toThrow();

        expect(stream).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('cheapestModel', () => {
    it('when asked, should answer the cheapest model of its catalog', () => {
      expect(build().cheapestModel()).toBe(cheapestAnthropicModel());
    });
  });

  describe('models', () => {
    it('when models are listed, should keep only open priced models ordered by cost', async () => {
      list.mockReturnValue(
        asyncList([
          { id: 'claude-opus-5-5', max_input_tokens: 1_000_000 },
          { id: 'claude-mythos-5-2' },
          { id: 'claude-haiku-4-5-20251001', max_input_tokens: 200_000 },
          { id: 'claude-haiku-5-5' },
        ]),
      );

      const result = await build().models();

      expect(result.map((m) => m.name)).toEqual([
        'claude-haiku-5-5',
        'claude-haiku-4-5-20251001',
        'claude-opus-5-5',
      ]);
      expect(result[2]).toMatchObject({
        provider: 'anthropic',
        details: { context_length: 1_000_000 },
      });
    });

    it('when listing models fails, should throw', async () => {
      list.mockImplementation(() => {
        throw new Error('x');
      });

      await expect(build().models()).rejects.toThrow(
        'A requisição para listar modelos da Anthropic falhou.',
      );
    });
  });

  describe('thinking', () => {
    it('when asked, should offer no options', async () => {
      await expect(build().thinking()).resolves.toEqual([]);
    });
  });

  describe('resposta aos pedaços', () => {
    it('when the caller wants the pieces, should hand each text piece over as the stream writes it', async () => {
      finalMessage.mockResolvedValue(answer('Olá, mundo'));
      on.mockImplementation((_event: string, listener: (text: string) => void) => {
        listener('Olá, ');
        listener('mundo');
      });
      const pieces: string[] = [];

      const text = await build().chat({
        message: 'oi',
        model: cheapestAnthropicModel(),
        onChunk: (piece) => pieces.push(piece),
      });

      expect(text).toBe('Olá, mundo');
      expect(pieces).toEqual(['Olá, ', 'mundo']);
      expect(on).toHaveBeenCalledWith('text', expect.any(Function));
    });

    it('when the caller does not want pieces, should not listen to the stream', async () => {
      on.mockReset();
      finalMessage.mockResolvedValue(answer('ok'));

      await build().chat({ message: 'oi', model: cheapestAnthropicModel() });

      expect(on).not.toHaveBeenCalled();
    });
  });
});
