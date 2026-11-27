import { of } from 'rxjs';
import type { HttpService } from '@nestjs/axios';

import type { BackConfig } from '../../../../config/back-config';
import type { LocalAssistant } from '../../../../config/local-assistant';
import { AiUsageService } from '../../usage/ai-usage.service';

import { OllamaProvider } from './ollama.provider';

const ASSISTANT_URL = 'http://127.0.0.1:11435';

describe('OllamaProvider com o assistente local', () => {
  let http: { get: jest.Mock; post: jest.Mock };
  let assistant: LocalAssistant & { ensureRunning: jest.Mock; isInstalled: jest.Mock };
  let ollamaUrl: string;

  const provider = () =>
    new OllamaProvider(http as unknown as HttpService, new AiUsageService(), {
      get ollamaUrl() {
        return ollamaUrl;
      },
      localAssistant: () => assistant,
    } as unknown as BackConfig);

  beforeEach(() => {
    http = {
      get: jest.fn().mockReturnValue(of({ data: { models: [] } })),
      post: jest.fn().mockReturnValue(of({ data: { capabilities: ['completion'] } })),
    };
    assistant = {
      baseUrl: ASSISTANT_URL,
      isInstalled: jest.fn(() => true),
      ensureRunning: jest.fn().mockResolvedValue(undefined),
    };
    ollamaUrl = ASSISTANT_URL;
  });

  it('when listing models with the assistant in use, should start it before asking', async () => {
    await provider().models();

    expect(assistant.ensureRunning).toHaveBeenCalledTimes(1);
    expect(assistant.ensureRunning.mock.invocationCallOrder[0]).toBeLessThan(
      http.get.mock.invocationCallOrder[0],
    );
    expect(http.get).toHaveBeenCalledWith(`${ASSISTANT_URL}/api/tags`);
  });

  it('when asking about thinking with the assistant in use, should start it before asking', async () => {
    await provider().thinking('qwen3.5:4b');

    expect(assistant.ensureRunning).toHaveBeenCalledTimes(1);
    expect(assistant.ensureRunning.mock.invocationCallOrder[0]).toBeLessThan(
      http.post.mock.invocationCallOrder[0],
    );
  });

  it('when chatting with the assistant in use, should start it before the request', async () => {
    http.post.mockReturnValue(
      of({ data: { message: { content: 'oi' }, prompt_eval_count: 1, eval_count: 1 } }),
    );

    await provider().chat({ message: 'oi', model: 'qwen3.5:4b' });

    expect(assistant.ensureRunning).toHaveBeenCalledTimes(1);
    expect(assistant.ensureRunning.mock.invocationCallOrder[0]).toBeLessThan(
      http.post.mock.invocationCallOrder[0],
    );
  });

  it('when the user pointed to another Ollama, should leave the assistant off', async () => {
    ollamaUrl = 'http://outro-pc:11434';

    await provider().models();

    expect(assistant.ensureRunning).not.toHaveBeenCalled();
    expect(http.get).toHaveBeenCalledWith('http://outro-pc:11434/api/tags');
  });

  it('when the assistant is not installed, should not try to start it', async () => {
    assistant.isInstalled.mockReturnValue(false);
    ollamaUrl = 'http://localhost:11434';

    await provider().models();

    expect(assistant.ensureRunning).not.toHaveBeenCalled();
  });

  it('when there is no assistant at all, should work as before', async () => {
    const plain = new OllamaProvider(http as unknown as HttpService, new AiUsageService(), {
      ollamaUrl: 'http://localhost:11434',
    } as BackConfig);

    await expect(plain.models()).resolves.toEqual([]);
  });

  it('when the assistant cannot start, should fail with its message and not ask the server', async () => {
    assistant.ensureRunning.mockRejectedValue(new Error('O assistente local não iniciou.'));

    await expect(provider().models()).rejects.toThrow('O assistente local não iniciou.');
    expect(http.get).not.toHaveBeenCalled();
  });

  it('when the address changes between calls, should use the new one without restarting', async () => {
    const instance = provider();

    await instance.models();
    ollamaUrl = 'http://outro-pc:11434';
    await instance.models();

    expect(http.get).toHaveBeenNthCalledWith(1, `${ASSISTANT_URL}/api/tags`);
    expect(http.get).toHaveBeenNthCalledWith(2, 'http://outro-pc:11434/api/tags');
  });

  it('when only checking health, should not wake the assistant up just for that', async () => {
    http.get.mockReturnValue(of({ data: {} }));

    await provider().health();

    expect(assistant.ensureRunning).not.toHaveBeenCalled();
  });
});
