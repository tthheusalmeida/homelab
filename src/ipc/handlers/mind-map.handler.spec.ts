import { IpcChannels } from '../../shared/channels';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { MindMapHandler } from './mind-map.handler';

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

const map = {
  nodes: [{ label: 'A', children: [] }],
  model: 'm',
  createdAt: 'd',
  stale: false,
  edited: false,
};

function setup(overrides: Partial<Record<'get' | 'generate' | 'save' | 'delete', jest.Mock>> = {}) {
  const port = {
    get: jest.fn().mockResolvedValue(map),
    generate: jest.fn().mockResolvedValue(map),
    save: jest.fn().mockResolvedValue({ ...map, edited: true }),
    delete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  const images = { save: jest.fn().mockResolvedValue({ saved: true, path: 'D:/mapa.png' }) };
  const ipc = new FakeIpcMain();

  new IpcRegistrar(ipc).register([new MindMapHandler(port, images)]);

  return { ipc, port, images };
}

describe('MindMapHandler', () => {
  it('when library:mind-map:delete is called, should delete only the mind map of that page', async () => {
    const { ipc, port } = setup();

    await expect(ipc.invoke(IpcChannels.library.mindMap.delete, { id: '1' })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(port.delete).toHaveBeenCalledWith('1');
  });

  it('when library:mind-map:get is called, should return the saved map of the page', async () => {
    const { ipc, port } = setup();

    await expect(ipc.invoke(IpcChannels.library.mindMap.get, { id: '1' })).resolves.toEqual({
      ok: true,
      data: map,
    });
    expect(port.get).toHaveBeenCalledWith('1');
  });

  it('when there is no map yet, should answer ok with null', async () => {
    const { ipc } = setup({ get: jest.fn().mockResolvedValue(null) });

    await expect(ipc.invoke(IpcChannels.library.mindMap.get, { id: '1' })).resolves.toEqual({
      ok: true,
      data: null,
    });
  });

  it('when library:mind-map:generate is called without a model, should generate with the default', async () => {
    const { ipc, port } = setup();

    await expect(ipc.invoke(IpcChannels.library.mindMap.generate, { id: '1' })).resolves.toEqual({
      ok: true,
      data: map,
    });
    expect(port.generate).toHaveBeenCalledWith('1', undefined);
  });

  it('when a model is sent, should pass it to the service', async () => {
    const { ipc, port } = setup();

    await ipc.invoke(IpcChannels.library.mindMap.generate, { id: '1', modelId: 'gemini-x' });

    expect(port.generate).toHaveBeenCalledWith('1', 'gemini-x');
  });

  it('when the page does not exist, should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      get: jest.fn().mockRejectedValue(new HttpLikeError('sem página', 404)),
    });

    const result = await ipc.invoke(IpcChannels.library.mindMap.get, { id: 'x' });

    expect(result).toMatchObject({ ok: false, error: { code: IpcErrorCode.NOT_FOUND } });
  });

  it('when the page is not a summary, should answer VALIDATION', async () => {
    const { ipc } = setup({
      generate: jest.fn().mockRejectedValue(new HttpLikeError('só para resumos', 400)),
    });

    const result = await ipc.invoke(IpcChannels.library.mindMap.generate, { id: '1' });

    expect(result).toMatchObject({ ok: false, error: { code: IpcErrorCode.VALIDATION } });
  });

  it('when the AI fails, should answer PROVIDER_FAILED with the message', async () => {
    const { ipc } = setup({
      generate: jest.fn().mockRejectedValue(new HttpLikeError('O limite foi atingido', 502)),
    });

    const result = await ipc.invoke(IpcChannels.library.mindMap.generate, { id: '1' });

    expect(result).toMatchObject({
      ok: false,
      error: { code: IpcErrorCode.PROVIDER_FAILED, message: 'O limite foi atingido' },
    });
    expect(IpcError).toBeDefined();
  });
});

describe('MindMapHandler: save-image', () => {
  it('when library:mind-map:save-image is called, should hand the name and the PNG to the saver', async () => {
    const { ipc, images } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.mindMap.saveImage, {
        fileName: 'Mapa mental - Redes.png',
        dataBase64: 'iVBORw0KGgo=',
      }),
    ).resolves.toEqual({ ok: true, data: { saved: true, path: 'D:/mapa.png' } });
    expect(images.save).toHaveBeenCalledWith('Mapa mental - Redes.png', 'iVBORw0KGgo=');
  });

  it('when the user closes the save dialog, should answer ok with saved false', async () => {
    const { ipc, images } = setup();

    images.save.mockResolvedValue({ saved: false });

    await expect(
      ipc.invoke(IpcChannels.library.mindMap.saveImage, { fileName: 'a.png', dataBase64: 'AAAA' }),
    ).resolves.toEqual({ ok: true, data: { saved: false } });
  });

  it.each([
    ['no file name', { dataBase64: 'AAAA' }],
    ['a file name that is not a text', { fileName: 3, dataBase64: 'AAAA' }],
    ['no content', { fileName: 'a.png' }],
    ['empty content', { fileName: 'a.png', dataBase64: '' }],
  ])('when the payload has %s, should answer VALIDATION without saving', async (_name, payload) => {
    const { ipc, images } = setup();

    const result = await ipc.invoke(IpcChannels.library.mindMap.saveImage, payload as never);

    expect(result).toMatchObject({ ok: false, error: { code: IpcErrorCode.VALIDATION } });
    expect(images.save).not.toHaveBeenCalled();
  });

  it('when the saver rejects with an IpcError, should keep its code and message', async () => {
    const { ipc, images } = setup();

    images.save.mockRejectedValue(new IpcError(IpcErrorCode.PERSIST_FAILED, 'Disco cheio.'));

    await expect(
      ipc.invoke(IpcChannels.library.mindMap.saveImage, { fileName: 'a.png', dataBase64: 'AAAA' }),
    ).resolves.toMatchObject({
      ok: false,
      error: { code: IpcErrorCode.PERSIST_FAILED, message: 'Disco cheio.' },
    });
  });
});

describe('MindMapHandler: save', () => {
  const nodes = [{ label: 'Termo', note: 'Frase', children: [{ label: 'Filho', children: [] }] }];

  it('when library:mind-map:save is called, should hand the page, subtitle and branches to the service', async () => {
    const { ipc, port } = setup();

    await expect(
      ipc.invoke(IpcChannels.library.mindMap.save, { id: '1', subtitle: 'Sobre redes', nodes }),
    ).resolves.toEqual({ ok: true, data: { ...map, edited: true } });
    expect(port.save).toHaveBeenCalledWith('1', { subtitle: 'Sobre redes', nodes });
  });

  it('when there is no subtitle, should save with only the branches', async () => {
    const { ipc, port } = setup();

    await ipc.invoke(IpcChannels.library.mindMap.save, { id: '1', nodes });

    expect(port.save).toHaveBeenCalledWith('1', { subtitle: undefined, nodes });
  });

  it.each([
    ['no branches', { id: '1' }],
    ['branches that are not a list', { id: '1', nodes: 'x' }],
    ['branches that are an object', { id: '1', nodes: {} }],
  ])('when the payload has %s, should answer VALIDATION without saving', async (_name, payload) => {
    const { ipc, port } = setup();

    const result = await ipc.invoke(IpcChannels.library.mindMap.save, payload as never);

    expect(result).toMatchObject({ ok: false, error: { code: IpcErrorCode.VALIDATION } });
    expect(port.save).not.toHaveBeenCalled();
  });

  it('when the service rejects the map, should answer VALIDATION with its message', async () => {
    const { ipc } = setup({
      save: jest
        .fn()
        .mockRejectedValue(
          new HttpLikeError('O mapa precisa ter pelo menos um ramo com texto.', 400),
        ),
    });

    await expect(
      ipc.invoke(IpcChannels.library.mindMap.save, { id: '1', nodes: [] }),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        code: IpcErrorCode.VALIDATION,
        message: 'O mapa precisa ter pelo menos um ramo com texto.',
      },
    });
  });

  it('when the page does not exist, should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      save: jest.fn().mockRejectedValue(new HttpLikeError('sem página', 404)),
    });

    await expect(
      ipc.invoke(IpcChannels.library.mindMap.save, { id: 'x', nodes }),
    ).resolves.toMatchObject({ ok: false, error: { code: IpcErrorCode.NOT_FOUND } });
  });
});
