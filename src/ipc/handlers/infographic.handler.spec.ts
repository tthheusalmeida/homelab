import { NotFoundException } from '@nestjs/common';

import { IpcChannels } from '../../shared/channels';
import { IpcErrorCode } from '../../shared/errors';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { InfographicHandler } from './infographic.handler';

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

const infographic = {
  layout: 'steps',
  title: 'T',
  piece: '',
  items: [],
  model: 'm',
  createdAt: 'd',
  stale: false,
};

function setup(overrides: Partial<Record<'get' | 'generate' | 'save' | 'delete', jest.Mock>> = {}) {
  const port = {
    get: jest.fn().mockResolvedValue(infographic),
    generate: jest.fn().mockResolvedValue(infographic),
    save: jest.fn().mockResolvedValue({ ...infographic, edited: true }),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const ipc = new FakeIpcMain();

  new IpcRegistrar(ipc).register([new InfographicHandler(port)]);

  return { ipc, port };
}

describe('InfographicHandler', () => {
  it('when library:infographic:get is called, should return the saved infographic of the page', async () => {
    const { ipc, port } = setup();

    await expect(ipc.invoke(IpcChannels.library.infographic.get, { id: '1' })).resolves.toEqual({
      ok: true,
      data: infographic,
    });
    expect(port.get).toHaveBeenCalledWith('1');
  });

  it('when library:infographic:save is called, should save the infographic as the user edited it', async () => {
    const { ipc, port } = setup();
    const input = { title: 'T', piece: 'financas.moedas', sections: [{ layout: 'steps' }] };

    await expect(
      ipc.invoke(IpcChannels.library.infographic.save, { id: '1', infographic: input }),
    ).resolves.toEqual({ ok: true, data: { ...infographic, edited: true } });
    expect(port.save).toHaveBeenCalledWith('1', input);
  });

  it.each([
    ['without the infographic', undefined],
    ['with the infographic as text', 'x'],
    ['with null', null],
    ['without the sections', { title: 'T' }],
    ['with the sections as text', { title: 'T', sections: 'x' }],
  ])('when saving %s, should answer VALIDATION and not save', async (_name, value) => {
    const { ipc, port } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.infographic.save, { id: '1', infographic: value as never }),
    ).resolves.toMatchObject({ ok: false, error: { code: IpcErrorCode.VALIDATION } });
    expect(port.save).not.toHaveBeenCalled();
  });

  it('when library:infographic:delete is called, should delete only the infographic of that page', async () => {
    const { ipc, port } = setup();

    await expect(ipc.invoke(IpcChannels.library.infographic.delete, { id: '1' })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(port.delete).toHaveBeenCalledWith('1');
  });

  it('when the page does not exist, should answer the error of the delete', async () => {
    const { ipc } = setup({
      delete: jest.fn().mockRejectedValue(new NotFoundException('Documento não encontrado')),
    });

    await expect(
      ipc.invoke(IpcChannels.library.infographic.delete, { id: 'x' }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: IpcErrorCode.NOT_FOUND },
    });
  });

  it('when there is no infographic yet, should answer ok with null', async () => {
    const { ipc } = setup({ get: jest.fn().mockResolvedValue(null) });

    await expect(ipc.invoke(IpcChannels.library.infographic.get, { id: '1' })).resolves.toEqual({
      ok: true,
      data: null,
    });
  });

  it('when library:infographic:generate is called with only the id, should generate with the defaults', async () => {
    const { ipc, port } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.infographic.generate, { id: '1' }),
    ).resolves.toEqual({ ok: true, data: infographic });
    expect(port.generate).toHaveBeenCalledWith('1', { modelId: undefined, layout: undefined });
  });

  it('when a model and a layout are sent, should pass both to the service', async () => {
    const { ipc, port } = setup();

    await ipc.invoke(IpcChannels.library.infographic.generate, {
      id: '1',
      modelId: 'gemini-x',
      layout: 'funnel',
    });

    expect(port.generate).toHaveBeenCalledWith('1', { modelId: 'gemini-x', layout: 'funnel' });
  });

  it('when the layout is unknown, should answer VALIDATION without calling the service', async () => {
    const { ipc, port } = setup();

    const result = await ipc.invoke(IpcChannels.library.infographic.generate, {
      id: '1',
      layout: 'pizza' as never,
    });

    expect(result).toMatchObject({ ok: false, error: { code: IpcErrorCode.VALIDATION } });
    expect(port.generate).not.toHaveBeenCalled();
  });

  it('when the page does not exist, should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      get: jest.fn().mockRejectedValue(new HttpLikeError('sem página', 404)),
    });

    const result = await ipc.invoke(IpcChannels.library.infographic.get, { id: 'x' });

    expect(result).toMatchObject({ ok: false, error: { code: IpcErrorCode.NOT_FOUND } });
  });

  it('when the page is not a summary, should answer VALIDATION', async () => {
    const { ipc } = setup({
      generate: jest.fn().mockRejectedValue(new HttpLikeError('só para resumos', 400)),
    });

    const result = await ipc.invoke(IpcChannels.library.infographic.generate, { id: '1' });

    expect(result).toMatchObject({ ok: false, error: { code: IpcErrorCode.VALIDATION } });
  });

  it('when the AI fails, should answer PROVIDER_FAILED with the message', async () => {
    const { ipc } = setup({
      generate: jest.fn().mockRejectedValue(new HttpLikeError('O limite foi atingido', 502)),
    });

    const result = await ipc.invoke(IpcChannels.library.infographic.generate, { id: '1' });

    expect(result).toMatchObject({
      ok: false,
      error: { code: IpcErrorCode.PROVIDER_FAILED, message: 'O limite foi atingido' },
    });
  });
});
