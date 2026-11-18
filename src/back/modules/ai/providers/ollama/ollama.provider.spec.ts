import { of, throwError } from 'rxjs';
import type { HttpService } from '@nestjs/axios';
import type { BackConfig } from '../../../../config/back-config';

import { OllamaProvider } from './ollama.provider';
import { AiUsageService } from '../../usage/ai-usage.service';

const validModel = (name: string) => ({
  name,
  model: name,
  size: 123,
  details: {
    family: 'qwen',
    families: ['qwen'],
    parameter_size: '8B',
    quantization_level: 'Q4',
    context_length: 4096,
  },
  capabilities: ['completion', 'thinking'],
});

describe('OllamaProvider', () => {
  const OLLAMA_URL = 'http://ollama.test:1234';
  let http: { get: jest.Mock; post: jest.Mock };
  let usage: AiUsageService;
  let provider: OllamaProvider;

  beforeEach(() => {
    http = { get: jest.fn(), post: jest.fn() };
    usage = new AiUsageService();
    provider = new OllamaProvider(http as unknown as HttpService, usage, {
      ollamaUrl: OLLAMA_URL,
    } as BackConfig);
  });

  it('when read, should have name ollama', () => {
    expect(provider.name).toBe('ollama');
  });

  describe('health', () => {
    it('when /api/tags responds, should report ok', async () => {
      http.get.mockReturnValue(of({ data: {} }));

      await expect(provider.health()).resolves.toMatchObject({
        service: 'ollama',
        status: 'ok',
      });
    });

    it('when the health call fails, should report error', async () => {
      http.get.mockReturnValue(throwError(() => new Error('down')));

      await expect(provider.health()).resolves.toMatchObject({
        status: 'error',
      });
    });
  });

  describe('chat', () => {
    it('when chat succeeds with thinking on, should return text, send think=true and record usage', async () => {
      http.post.mockReturnValue(
        of({
          data: {
            message: { content: 'olá' },
            prompt_eval_count: 7,
            eval_count: 3,
          },
        }),
      );

      const text = await provider.chat({
        message: 'oi',
        model: 'qwen3.5:8b',
        thinking: 'on',
      });

      expect(text).toBe('olá');
      expect(http.post).toHaveBeenCalledWith(
        `${OLLAMA_URL}/api/chat`,
        expect.objectContaining({
          model: 'qwen3.5:8b',
          think: true,
          stream: false,
          messages: [{ role: 'user', content: 'oi' }],
        }),
      );

      const [record] = usage.getUsage().recentRequests;
      expect(record).toMatchObject({
        provider: 'ollama',
        operation: 'chat',
        inputTokens: 7,
        outputTokens: 3,
        totalTokens: 10,
        estimatedCost: 0,
        success: true,
      });
    });

    it('when thinking is not on, should send think=false', async () => {
      http.post.mockReturnValue(of({ data: { message: { content: 'x' } } }));

      await provider.chat({ message: 'a', model: 'm', thinking: 'off' });

      expect(http.post.mock.calls[0][1]).toMatchObject({ think: false });
    });

    it('when the response has no token counts, should count them as 0', async () => {
      http.post.mockReturnValue(of({ data: { message: { content: 'x' } } }));

      await provider.chat({ message: 'a', model: 'm' });

      expect(usage.getUsage().summary.totalTokens).toBe(0);
    });

    it('when the chat response is invalid, should record a failure and throw', async () => {
      http.post.mockReturnValue(of({ data: { foo: 1 } }));

      await expect(provider.chat({ message: 'a', model: 'm' })).rejects.toThrow(
        'chat do Ollama falhou',
      );

      expect(usage.getUsage().recentRequests[0].success).toBe(false);
    });

    it('when Ollama is not running, should explain it could not be reached and keep the cause', async () => {
      const cause = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
      http.post.mockReturnValue(throwError(() => cause));

      const error = await provider.chat({ message: 'a', model: 'm' }).catch((e: Error) => e);

      expect((error as Error).message).toContain('Não foi possível conectar ao Ollama');
      expect((error as Error).cause).toBe(cause);
    });

    it('when the model is not installed, should say so in plain words', async () => {
      http.post.mockReturnValue(
        throwError(() =>
          Object.assign(new Error('404'), {
            response: { status: 404, data: { error: 'model not found' } },
          }),
        ),
      );

      await expect(provider.chat({ message: 'a', model: 'm' })).rejects.toThrow(
        'modelo escolhido não está instalado no Ollama',
      );
    });

    it('when the network fails, should record a failure with zeroed tokens', async () => {
      http.post.mockReturnValue(throwError(() => new Error('net')));

      await expect(provider.chat({ message: 'a', model: 'm' })).rejects.toThrow();

      expect(usage.getUsage().recentRequests[0]).toMatchObject({
        success: false,
        totalTokens: 0,
        estimatedCost: 0,
      });
    });
  });

  describe('chat com histórico', () => {
    const history = [
      { role: 'user', content: 'p1' },
      { role: 'assistant', content: 'r1' },
      { role: 'user', content: 'p2' },
    ];

    it('when the whole conversation is sent, should post every turn in order instead of the single message', async () => {
      http.post.mockReturnValue(of({ data: { message: { content: 'r2' } } }));

      await provider.chat({ message: 'p2', model: 'm', messages: history as never });

      const [url, body] = http.post.mock.calls.find(([called]) =>
        String(called).endsWith('/api/chat'),
      );

      expect(url).toBe(`${OLLAMA_URL}/api/chat`);
      expect(body.messages).toEqual(history);
    });

    it('when sending a conversation, should ask for a context that fits it, capped by the model limit read from /api/show', async () => {
      http.post.mockImplementation((url: string) =>
        of(
          url.endsWith('/api/show')
            ? { data: { model_info: { 'llama.context_length': 8192 } } }
            : { data: { message: { content: 'x' } } },
        ),
      );
      const long = [{ role: 'user', content: 'a'.repeat(4 * 30_000) }];

      await provider.chat({ message: 'a', model: 'm', messages: long as never });

      const body = http.post.mock.calls.find(([called]) =>
        String(called).endsWith('/api/chat'),
      )![1];

      expect(body.options).toEqual({ num_ctx: 8192 });
    });

    it('when the model limit cannot be read, should still send a context that fits the conversation', async () => {
      http.post.mockImplementation((url: string) =>
        url.endsWith('/api/show')
          ? throwError(() => new Error('sem show'))
          : of({ data: { message: { content: 'x' } } }),
      );

      await provider.chat({ message: 'p2', model: 'm', messages: history as never });

      const body = http.post.mock.calls.find(([called]) =>
        String(called).endsWith('/api/chat'),
      )![1];

      expect(body.options).toEqual({ num_ctx: 4096 });
    });

    it('when the same model is used again, should read its limit only once', async () => {
      http.post.mockImplementation((url: string) =>
        of(
          url.endsWith('/api/show')
            ? { data: { model_info: { 'llama.context_length': 32768 } } }
            : { data: { message: { content: 'x' } } },
        ),
      );

      await provider.chat({ message: 'a', model: 'm', messages: history as never });
      await provider.chat({ message: 'a', model: 'm', messages: history as never });

      expect(
        http.post.mock.calls.filter(([url]) => String(url).endsWith('/api/show')),
      ).toHaveLength(1);
    });

    it('when only a single message is sent (summary jobs), should not touch the context window nor call /api/show', async () => {
      http.post.mockReturnValue(of({ data: { message: { content: 'x' } } }));

      await provider.chat({ message: 'a', model: 'm' });

      expect(http.post).toHaveBeenCalledTimes(1);
      expect(http.post.mock.calls[0][1]).not.toHaveProperty('options');
    });
  });

  describe('contexto dos modelos', () => {
    it('when listing models, should fill the context length from /api/show because /api/tags does not report it', async () => {
      http.get.mockReturnValue(of({ data: { models: [validModel('a:1b'), validModel('b:2b')] } }));
      http.post.mockImplementation((_url: string, body: { name: string }) =>
        of({
          data: { model_info: { 'llama.context_length': body.name === 'a:1b' ? 131072 : 0 } },
        }),
      );

      const models = await provider.models();

      expect(models.map((model) => [model.name, model.details.context_length])).toEqual([
        ['a:1b', 131072],
        ['b:2b', 4096],
      ]);
    });

    it('when /api/show fails for a model, should keep what /api/tags said and still list it', async () => {
      http.get.mockReturnValue(of({ data: { models: [validModel('a:1b')] } }));
      http.post.mockReturnValue(throwError(() => new Error('sem show')));

      await expect(provider.models()).resolves.toHaveLength(1);
    });
  });

  describe('models', () => {
    it('when models are listed, should map, normalize details and sort by name', async () => {
      http.get.mockReturnValue(of({ data: { models: [validModel('b'), validModel('a')] } }));

      const result = await provider.models();

      expect(result.map((m) => m.name)).toEqual(['a', 'b']);
      expect(result[0]).toMatchObject({
        provider: 'ollama',
        capabilities: ['completion', 'thinking'],
        details: { embedding_length: 0, context_length: 4096 },
      });
    });

    it('when the models payload has an unexpected shape, should throw', async () => {
      http.get.mockReturnValue(of({ data: { nope: [] } }));

      await expect(provider.models()).rejects.toThrow('listar modelos');
    });

    it('when a model item is invalid, should throw', async () => {
      http.get.mockReturnValue(of({ data: { models: [{ name: 'x' }] } }));

      await expect(provider.models()).rejects.toThrow('listar modelos');
    });
  });

  describe('thinking', () => {
    it('when the model has the thinking capability, should return off and on options', async () => {
      http.post.mockReturnValue(of({ data: { capabilities: ['completion', 'thinking'] } }));

      await expect(provider.thinking('m')).resolves.toEqual([
        { id: 'off', label: 'Desativado' },
        { id: 'on', label: 'Ativado' },
      ]);
      expect(http.post).toHaveBeenCalledWith(`${OLLAMA_URL}/api/show`, {
        name: 'm',
      });
    });

    it('when the model lacks the thinking capability, should return an empty list', async () => {
      http.post.mockReturnValue(of({ data: { capabilities: ['completion'] } }));

      await expect(provider.thinking('m')).resolves.toEqual([]);
    });

    it('when the response has no capabilities, should return an empty list', async () => {
      http.post.mockReturnValue(of({ data: {} }));

      await expect(provider.thinking('m')).resolves.toEqual([]);
    });

    it('when the network fails, should throw an error naming the model', async () => {
      http.post.mockReturnValue(throwError(() => new Error('x')));

      await expect(provider.thinking('meu-modelo')).rejects.toThrow('meu-modelo');
    });
  });
});
