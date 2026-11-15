import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import { checkService } from './services';

const report = { service: 'system', description: 'd', checks: [] };

describe('checkService', () => {
  it('when asking for the system health, should call health:system and return the report', async () => {
    const invoke = mockApi({ [IpcChannels.health.system]: () => ok(report) });

    await expect(checkService(IpcChannels.health.system)).resolves.toEqual(report);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.health.system);
  });

  it('when asking for the ai health, should call health:ai', async () => {
    const invoke = mockApi({ [IpcChannels.health.ai]: () => ok({ ...report, service: 'ai' }) });

    await checkService(IpcChannels.health.ai);

    expect(invoke).toHaveBeenCalledWith(IpcChannels.health.ai);
  });

  it('when the channel fails, should throw an error with the message', async () => {
    mockApi({ [IpcChannels.health.system]: () => failure('INTERNAL', 'quebrou') });

    await expect(checkService(IpcChannels.health.system)).rejects.toThrow('quebrou');
  });
});
