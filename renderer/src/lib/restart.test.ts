import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { mockApi, ok, payloadsOf } from '#test/api-mock';

import { relaunchApp, RestartStrings } from './restart';

describe('restart', () => {
  it('when relaunching, should ask the main to relaunch the app', async () => {
    const invoke = mockApi({ [IpcChannels.app.relaunch]: () => ok(undefined) });

    await relaunchApp();

    expect(payloadsOf(invoke, IpcChannels.app.relaunch)).toHaveLength(1);
  });

  it('when listing the texts, should be in Portuguese and ask to restart', () => {
    expect(RestartStrings.action).toBe('Reiniciar agora');
    expect(RestartStrings.message).toMatch(/reiniciar/);
    expect(RestartStrings.sidebarTitle).toBe('Reinício pendente');
  });
});
