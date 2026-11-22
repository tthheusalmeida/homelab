import { NotFoundException } from '@nestjs/common';

import { IpcChannels } from '../../shared/channels';
import { IpcErrorCode } from '../../shared/errors';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { PromptsHandler } from './prompts.handler';

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

const overview = {
  kinds: [],
  limits: { minChars: 1, maxChars: 2, maxNameChars: 3, maxVersionsPerKind: 4 },
};

function setup(
  overrides: Partial<Record<'overview' | 'save' | 'delete' | 'activate', jest.Mock>> = {},
) {
  const port = {
    overview: jest.fn().mockReturnValue(overview),
    save: jest.fn().mockReturnValue(overview),
    delete: jest.fn().mockReturnValue(overview),
    activate: jest.fn().mockReturnValue(overview),
    ...overrides,
  };
  const ipc = new FakeIpcMain();

  new IpcRegistrar(ipc).register([new PromptsHandler(port)]);

  return { ipc, port };
}

describe('PromptsHandler', () => {
  it('when listing, should answer with the overview', async () => {
    const { ipc } = setup();

    await expect(ipc.invoke(IpcChannels.prompts.list)).resolves.toEqual({
      ok: true,
      data: overview,
    });
  });

  it('when saving, should pass the request to the service', async () => {
    const { ipc, port } = setup();
    const request = { kind: 'mindMap', name: 'A', text: 'x'.repeat(50) };

    await ipc.invoke(IpcChannels.prompts.save, request);

    expect(port.save).toHaveBeenCalledWith(request);
  });

  it('when deleting and activating, should pass the request to the service', async () => {
    const { ipc, port } = setup();

    await ipc.invoke(IpcChannels.prompts.delete, { kind: 'mindMap', id: 'v1' });
    await ipc.invoke(IpcChannels.prompts.activate, { kind: 'mindMap', id: null });

    expect(port.delete).toHaveBeenCalledWith({ kind: 'mindMap', id: 'v1' });
    expect(port.activate).toHaveBeenCalledWith({ kind: 'mindMap', id: null });
  });

  it('when the service refuses the text, should answer VALIDATION with its message', async () => {
    const { ipc } = setup({
      save: jest.fn().mockImplementation(() => {
        throw new HttpLikeError('O prompt precisa ter pelo menos 40 caracteres.', 400);
      }),
    });

    await expect(ipc.invoke(IpcChannels.prompts.save, {})).resolves.toEqual({
      ok: false,
      error: {
        code: IpcErrorCode.VALIDATION,
        message: 'O prompt precisa ter pelo menos 40 caracteres.',
      },
    });
  });

  it('when the version does not exist, should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      activate: jest.fn().mockImplementation(() => {
        throw new NotFoundException('Essa versão do prompt não existe mais.');
      }),
    });

    const result = (await ipc.invoke(IpcChannels.prompts.activate, {
      kind: 'mindMap',
      id: 'x',
    })) as { ok: boolean; error: { code: string } };

    expect(result.ok).toBe(false);
    expect(result.error.code).toBe(IpcErrorCode.NOT_FOUND);
  });
});
