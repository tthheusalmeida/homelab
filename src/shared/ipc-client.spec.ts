import { IpcChannels } from './channels';
import { IpcError } from './errors';
import { createIpcClient } from './ipc-client';

describe('createIpcClient', () => {
  it('when the envelope is ok, should return only the data', async () => {
    const api = { invoke: jest.fn().mockResolvedValue({ ok: true, data: 'pong' }) };
    const client = createIpcClient(api);

    await expect(client.invoke(IpcChannels.app.ping)).resolves.toBe('pong');
    expect(api.invoke).toHaveBeenCalledWith(IpcChannels.app.ping);
  });

  it('when the envelope is a failure, should throw an IpcError with code and message', async () => {
    const api = {
      invoke: jest.fn().mockResolvedValue({
        ok: false,
        error: { code: 'NOT_CONFIGURED', message: 'Pasta da biblioteca não configurada' },
      }),
    };
    const client = createIpcClient(api);

    const error = await client.invoke(IpcChannels.app.version).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(IpcError);
    expect(error).toMatchObject({
      code: 'NOT_CONFIGURED',
      message: 'Pasta da biblioteca não configurada',
    });
  });

  it('when the bridge rejects, should propagate the rejection', async () => {
    const api = { invoke: jest.fn().mockRejectedValue(new Error('canal não permitido')) };
    const client = createIpcClient(api);

    await expect(client.invoke(IpcChannels.app.ping)).rejects.toThrow('canal não permitido');
  });
});
