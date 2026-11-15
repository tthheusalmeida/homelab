import { IpcChannels } from '../../shared/channels';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { JobHandler, type JobCatalogPort, type JobLauncherPort } from './job.handler';

/** Exceções do Nest (duck typing: o mapper só olha `getStatus`). */
class HttpLikeError extends Error {
  constructor(
    message: string,
    private readonly status: number,
  ) {
    super(message);
  }

  getStatus() {
    return this.status;
  }
}

type CatalogFakes = Record<keyof JobCatalogPort, jest.Mock>;
type LauncherFakes = Record<keyof JobLauncherPort, jest.Mock>;

function setup(catalog: Partial<CatalogFakes> = {}, launcher: Partial<LauncherFakes> = {}) {
  const catalogFakes: CatalogFakes = {
    list: jest.fn().mockReturnValue([]),
    get: jest.fn().mockReturnValue({ id: 'j1' }),
    listTypes: jest.fn().mockReturnValue([]),
    ...catalog,
  };
  const launcherFakes: LauncherFakes = {
    startVideoToTranscript: jest.fn().mockReturnValue({ id: 'j1', status: 'pending' }),
    startVideoToSummary: jest.fn().mockReturnValue({ id: 'j2', status: 'pending' }),
    ...launcher,
  };
  const ipc = new FakeIpcMain();
  new IpcRegistrar(ipc).register([new JobHandler(catalogFakes, launcherFakes)]);

  return { ipc, catalog: catalogFakes, launcher: launcherFakes };
}

const invalid = (message: string) => new HttpLikeError(message, 400);

describe('JobHandler: consulta', () => {
  it('when jobs:list is called, should answer the jobs from the catalog', async () => {
    const jobs = [{ id: 'j1', status: 'running' }];
    const { ipc } = setup({ list: jest.fn().mockReturnValue(jobs) });

    await expect(ipc.invoke(IpcChannels.jobs.list)).resolves.toEqual({ ok: true, data: jobs });
  });

  it('when there are no jobs, should answer an empty list', async () => {
    const { ipc } = setup();

    await expect(ipc.invoke(IpcChannels.jobs.list)).resolves.toEqual({ ok: true, data: [] });
  });

  it('when jobs:types is called, should answer the job types', async () => {
    const types = [{ type: 'video-to-transcript', label: 'Transcrição de vídeo' }];
    const { ipc } = setup({ listTypes: jest.fn().mockReturnValue(types) });

    await expect(ipc.invoke(IpcChannels.jobs.types)).resolves.toEqual({ ok: true, data: types });
  });

  it('when jobs:get is called, should ask the catalog for that id', async () => {
    const { ipc, catalog } = setup({ get: jest.fn().mockReturnValue({ id: 'abc' }) });

    await expect(ipc.invoke(IpcChannels.jobs.get, { id: 'abc' })).resolves.toEqual({
      ok: true,
      data: { id: 'abc' },
    });
    expect(catalog.get).toHaveBeenCalledWith('abc');
  });

  it('when the job does not exist, should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      get: jest.fn(() => {
        throw new HttpLikeError('Job "x" não encontrado', 404);
      }),
    });

    await expect(ipc.invoke(IpcChannels.jobs.get, { id: 'x' })).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Job "x" não encontrado' },
    });
  });
});

describe('JobHandler: criação', () => {
  it('when creating a transcript without optional fields, should pass only the url', async () => {
    const { ipc, launcher } = setup();

    await expect(
      ipc.invoke(IpcChannels.jobs.createVideoToTranscript, { url: 'https://x/v.mp4' }),
    ).resolves.toEqual({ ok: true, data: { id: 'j1', status: 'pending' } });
    expect(launcher.startVideoToTranscript).toHaveBeenCalledWith({ url: 'https://x/v.mp4' });
  });

  it('when creating a transcript with title, category and tags, should pass them all untouched', async () => {
    const { ipc, launcher } = setup();
    const request = {
      url: 'https://x/v.mp4',
      title: 'Práticas da Primeira Maneira',
      category: ['Tecnologia', 'DevOps'],
      tags: ['devops'],
    };

    await ipc.invoke(IpcChannels.jobs.createVideoToTranscript, request);

    expect(launcher.startVideoToTranscript).toHaveBeenCalledWith(request);
  });

  it('when creating a summary, should pass provider, model, thinking and detail to the launcher', async () => {
    const { ipc, launcher } = setup();
    const request = {
      url: 'https://x/v.mp4',
      providerId: 'ollama' as const,
      modelId: 'qwen3.5:1.7b',
      thinking: 'off',
      detail: 'brief' as const,
    };

    await expect(ipc.invoke(IpcChannels.jobs.createVideoToSummary, request)).resolves.toEqual({
      ok: true,
      data: { id: 'j2', status: 'pending' },
    });
    expect(launcher.startVideoToSummary).toHaveBeenCalledWith(request);
  });

  it('when creating a summary without detail, should pass the request without inventing one', async () => {
    const { ipc, launcher } = setup();
    const request = {
      url: 'https://x/v.mp4',
      providerId: 'gemini' as const,
      modelId: 'gemini-x',
      thinking: 'off',
    };

    await ipc.invoke(IpcChannels.jobs.createVideoToSummary, request);

    expect(launcher.startVideoToSummary).toHaveBeenCalledWith(request);
  });

  it('when the title is too long, should answer VALIDATION with the service message', async () => {
    const message = 'O título excede 120 caracteres.';
    const { ipc } = setup(
      {},
      {
        startVideoToTranscript: jest.fn(() => {
          throw invalid(message);
        }),
      },
    );

    await expect(
      ipc.invoke(IpcChannels.jobs.createVideoToTranscript, {
        url: 'https://x/v.mp4',
        title: 'x'.repeat(200),
      }),
    ).resolves.toEqual({ ok: false, error: { code: 'VALIDATION', message } });
  });

  it('when the category is invalid, should answer VALIDATION for transcript and summary alike', async () => {
    const message = 'O campo "category" deve ser uma lista de textos.';
    const { ipc } = setup(
      {},
      {
        startVideoToTranscript: jest.fn(() => {
          throw invalid(message);
        }),
        startVideoToSummary: jest.fn(() => {
          throw invalid(message);
        }),
      },
    );
    const expected = { ok: false, error: { code: 'VALIDATION', message } };

    await expect(
      ipc.invoke(IpcChannels.jobs.createVideoToTranscript, {
        url: 'u',
        category: 'x' as unknown as string[],
      }),
    ).resolves.toEqual(expected);
    await expect(
      ipc.invoke(IpcChannels.jobs.createVideoToSummary, {
        url: 'u',
        providerId: 'ollama',
        modelId: 'm',
        category: 'x' as unknown as string[],
      }),
    ).resolves.toEqual(expected);
  });

  it('when the launcher throws something unexpected, should answer INTERNAL instead of rejecting', async () => {
    const { ipc } = setup(
      {},
      {
        startVideoToSummary: jest.fn(() => {
          throw new Error('fila indisponível');
        }),
      },
    );

    await expect(
      ipc.invoke(IpcChannels.jobs.createVideoToSummary, {
        url: 'u',
        providerId: 'ollama',
        modelId: 'm',
      }),
    ).resolves.toEqual({ ok: false, error: { code: 'INTERNAL', message: 'fila indisponível' } });
  });
});
