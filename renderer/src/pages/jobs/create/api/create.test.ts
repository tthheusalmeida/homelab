import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import {
  createVideoToSummary,
  createVideoToSummaryBatch,
  createVideoToTranscript,
  createVideoToTranscriptBatch,
  getJobTypes,
} from './create';

describe('jobs create api', () => {
  it('when getting the job types, should call jobs:types and answer them', async () => {
    const types = [
      { type: 'video-to-transcript', label: 'Transcrição de vídeo', description: 'd' },
    ];
    const invoke = mockApi({ [IpcChannels.jobs.types]: () => ok(types) });

    await expect(getJobTypes()).resolves.toEqual(types);
    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.types);
  });

  it('when creating a transcript with only the url, should send just the url', async () => {
    const invoke = mockApi({
      [IpcChannels.jobs.createVideoToTranscript]: () => ok({ id: 'j1', status: 'pending' }),
    });

    await expect(createVideoToTranscript({ url: 'https://x/v.mp4' })).resolves.toEqual({
      id: 'j1',
      status: 'pending',
    });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.createVideoToTranscript, {
      url: 'https://x/v.mp4',
    });
  });

  it('when creating a transcript with title, category and tags, should send them all', async () => {
    const invoke = mockApi({
      [IpcChannels.jobs.createVideoToTranscript]: () => ok({ id: 'j1', status: 'pending' }),
    });
    const params = {
      url: 'https://x/v.mp4',
      title: 'Aula 1',
      category: ['Tecnologia', 'DevOps'],
      tags: ['devops'],
    };

    await createVideoToTranscript(params);

    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.createVideoToTranscript, params);
  });

  it('when creating a summary, should send provider, model, thinking and detail with the hints', async () => {
    const invoke = mockApi({
      [IpcChannels.jobs.createVideoToSummary]: () => ok({ id: 'j2', status: 'pending' }),
    });
    const params = {
      url: 'https://x/v.mp4',
      providerId: 'ollama',
      modelId: 'qwen3.5:1.7b',
      thinking: 'off',
      detail: 'study' as const,
      title: 'Resumo',
      tags: ['t'],
    };

    await expect(createVideoToSummary(params)).resolves.toEqual({ id: 'j2', status: 'pending' });
    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.createVideoToSummary, params);
  });

  it('when the hints are invalid, should reject with the VALIDATION message from the main', async () => {
    mockApi({
      [IpcChannels.jobs.createVideoToTranscript]: () =>
        failure('VALIDATION', 'O título excede 120 caracteres.'),
    });

    await expect(createVideoToTranscript({ url: 'u', title: 'x'.repeat(200) })).rejects.toThrow(
      'O título excede 120 caracteres.',
    );
  });

  it('when the summary fails to be created, should reject with the message from the main', async () => {
    mockApi({
      [IpcChannels.jobs.createVideoToSummary]: () => failure('INTERNAL', 'fila indisponível'),
    });

    await expect(
      createVideoToSummary({
        url: 'u',
        providerId: 'gemini',
        modelId: 'm',
        thinking: 'off',
        detail: 'detailed',
      }),
    ).rejects.toThrow('fila indisponível');
  });
});

describe('jobs create api (batch)', () => {
  it('when creating a transcript batch, should create one job per link in order with the same options', async () => {
    const invoke = mockApi({
      [IpcChannels.jobs.createVideoToTranscript]: () => ok({ id: 'j', status: 'pending' }),
    });

    await expect(
      createVideoToTranscriptBatch({
        urls: ['https://x/a', 'https://x/b', 'https://x/c'],
        category: ['Aulas'],
        tags: ['t'],
      }),
    ).resolves.toEqual({ created: 3, failed: [] });

    const calls = invoke.mock.calls.filter(
      ([channel]) => channel === IpcChannels.jobs.createVideoToTranscript,
    );
    expect(calls.map(([, payload]) => payload)).toEqual([
      { url: 'https://x/a', category: ['Aulas'], tags: ['t'] },
      { url: 'https://x/b', category: ['Aulas'], tags: ['t'] },
      { url: 'https://x/c', category: ['Aulas'], tags: ['t'] },
    ]);
  });

  it('when creating a summary batch, should send provider, model and detail with every link', async () => {
    const invoke = mockApi({
      [IpcChannels.jobs.createVideoToSummary]: () => ok({ id: 'j', status: 'pending' }),
    });

    await expect(
      createVideoToSummaryBatch({
        urls: ['https://x/a', 'https://x/b'],
        providerId: 'ollama',
        modelId: 'm',
        thinking: 'off',
        detail: 'study',
      }),
    ).resolves.toEqual({ created: 2, failed: [] });

    expect(invoke).toHaveBeenCalledWith(IpcChannels.jobs.createVideoToSummary, {
      url: 'https://x/b',
      providerId: 'ollama',
      modelId: 'm',
      thinking: 'off',
      detail: 'study',
    });
  });

  it('when one link fails, should keep creating the others and report the failed link', async () => {
    mockApi({
      [IpcChannels.jobs.createVideoToTranscript]: (payload) =>
        (payload as { url: string }).url === 'https://x/b'
          ? failure('INTERNAL', 'fila indisponível')
          : ok({ id: 'j', status: 'pending' }),
    });

    await expect(
      createVideoToTranscriptBatch({ urls: ['https://x/a', 'https://x/b', 'https://x/c'] }),
    ).resolves.toEqual({ created: 2, failed: ['https://x/b'] });
  });

  it('when every link fails, should reject with the last error from the main', async () => {
    mockApi({
      [IpcChannels.jobs.createVideoToTranscript]: () =>
        failure('VALIDATION', 'O título excede 120 caracteres.'),
    });

    await expect(
      createVideoToTranscriptBatch({ urls: ['https://x/a', 'https://x/b'] }),
    ).rejects.toThrow('O título excede 120 caracteres.');
  });

  it('when the list of links is empty, should create nothing', async () => {
    const invoke = mockApi({});

    await expect(createVideoToTranscriptBatch({ urls: [] })).resolves.toEqual({
      created: 0,
      failed: [],
    });
    expect(invoke).not.toHaveBeenCalled();
  });
});
