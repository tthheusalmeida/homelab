import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import { getAiUsage } from './getAiUsage';

describe('getAiUsage', () => {
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
