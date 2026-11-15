import { describe, expect, it } from 'vitest';

import { IpcChannels } from '#shared/channels';
import { failure, mockApi, ok } from '#test/api-mock';

import { createVideoToSummary, createVideoToTranscript, getJobTypes } from './create';

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
