import { describe, expect, it } from 'vitest';

import { IpcChannels } from '../../src/shared/channels';
import { failure, mockApi, ok } from '../settings/src/testing';

import { getAiModels, getAiProviders, getAiThinkingOptions } from './ai-chat-api';
import { getAiUsage } from './ai-usage-api';
import { checkService, HomeServicesMessages } from './home-services-api';

const report = { service: 'system', description: 'd', checks: [] };

describe('checkService (cópia do desktop)', () => {
  it('when the url is the system health, should call health:system and return the report', async () => {
    const invoke = mockApi({ [IpcChannels.health.system]: () => ok(report) });

    await expect(checkService('http://x/api/v1/health/system')).resolves.toEqual(report);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.health.system);
  });

  it('when the url is the ai health, should call health:ai', async () => {
    const invoke = mockApi({ [IpcChannels.health.ai]: () => ok({ ...report, service: 'ai' }) });

    await checkService('http://x/api/v1/health/ai');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.health.ai);
  });

  it('when the url is unknown, should throw without calling IPC', async () => {
    const invoke = mockApi({});

    await expect(checkService('http://x/outro')).rejects.toThrow(
      HomeServicesMessages.unknownService('http://x/outro'),
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it('when the channel fails, should throw an error with the message', async () => {
    mockApi({ [IpcChannels.health.system]: () => failure('INTERNAL', 'quebrou') });

    await expect(checkService('http://x/health/system')).rejects.toThrow('quebrou');
  });
});

describe('chat api (cópia do desktop)', () => {
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

describe('getAiUsage (cópia do desktop)', () => {
  it('when no params are given, should call ai:usage without provider', async () => {
    const invoke = mockApi({ [IpcChannels.ai.usage]: () => ok({ summary: {} }) });

    await getAiUsage();

    expect(invoke).toHaveBeenCalledWith(IpcChannels.ai.usage, { provider: undefined });
  });

  it('when provider is given, should send it in the payload', async () => {
    const invoke = mockApi({ [IpcChannels.ai.usage]: () => ok({ summary: {} }) });

    await getAiUsage({ provider: 'gemini' });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.ai.usage, { provider: 'gemini' });
  });

  it('when the main answers, should return the usage report', async () => {
    const usage = { summary: { totalRequests: 3 } };
    mockApi({ [IpcChannels.ai.usage]: () => ok(usage) });

    await expect(getAiUsage()).resolves.toEqual(usage);
  });
});
