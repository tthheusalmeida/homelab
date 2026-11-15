import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import { getAiModels, getAiProviders, getAiThinkingOptions } from './chat';

describe('chat api', () => {
  it('when getting providers, should call ai:providers', async () => {
    const providers = [{ id: 'gemini', label: 'Gemini' }];
    const invoke = mockApi({ [IpcChannels.ai.providers]: () => ok(providers) });

    await expect(getAiProviders()).resolves.toEqual(providers);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.ai.providers);
  });

  it('when getting models, should send the provider id', async () => {
    const invoke = mockApi({ [IpcChannels.ai.models]: () => ok([]) });

    await getAiModels('gemini');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.ai.models, { providerId: 'gemini' });
  });

  it('when getting thinking options, should send provider and model', async () => {
    const invoke = mockApi({ [IpcChannels.ai.thinking]: () => ok([]) });

    await getAiThinkingOptions('ollama', 'qwen3.5:8b');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.ai.thinking, {
      providerId: 'ollama',
      modelId: 'qwen3.5:8b',
    });
  });

  it('when a provider is not configured, should reject with the message from the main', async () => {
    mockApi({
      [IpcChannels.ai.models]: () => failure('NOT_CONFIGURED', 'Chave do Gemini não configurada.'),
    });

    await expect(getAiModels('gemini')).rejects.toThrow('Chave do Gemini não configurada.');
  });
});
