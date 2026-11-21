import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import { cleanLeftovers, retryJob, scanLeftovers } from './track';

describe('track api: arquivos de processos não terminados', () => {
  it('when scanning, should answer how many files and bytes were left', async () => {
    const invoke = mockApi({ [IpcChannels.jobs.leftovers]: () => ok({ files: 4, bytes: 2048 }) });

    await expect(scanLeftovers()).resolves.toEqual({ files: 4, bytes: 2048 });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.leftovers);
  });

  it('when cleaning, should answer what was deleted', async () => {
    const invoke = mockApi({
      [IpcChannels.jobs.cleanLeftovers]: () => ok({ files: 4, bytes: 2048, failed: 0 }),
    });

    await expect(cleanLeftovers()).resolves.toEqual({ files: 4, bytes: 2048, failed: 0 });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.cleanLeftovers);
  });

  it('when cleaning fails, should throw the message', async () => {
    mockApi({ [IpcChannels.jobs.cleanLeftovers]: () => failure('PERSIST_FAILED', 'Disco cheio.') });

    await expect(cleanLeftovers()).rejects.toThrow('Disco cheio.');
  });
});

describe('track api: tentar de novo trocando o modelo', () => {
  it('when no model is given, should send only the id', async () => {
    const invoke = mockApi({ [IpcChannels.jobs.retry]: () => ok({ id: 'n', status: 'pending' }) });

    await retryJob('j1');

    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.retry, { id: 'j1' });
  });

  it('when a model is given, should send it with the id', async () => {
    const invoke = mockApi({ [IpcChannels.jobs.retry]: () => ok({ id: 'n', status: 'pending' }) });

    await retryJob('j1', { providerId: 'ollama', modelId: 'qwen', thinking: 'off' });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.retry, {
      id: 'j1',
      providerId: 'ollama',
      modelId: 'qwen',
      thinking: 'off',
    });
  });
});
