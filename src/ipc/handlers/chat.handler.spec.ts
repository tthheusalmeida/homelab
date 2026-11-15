import { IpcChannels } from '../../shared/channels';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { ChatHandler } from './chat.handler';

const request = { message: 'oi', modelId: 'm', providerId: 'ollama' as const, thinking: 'off' };

function setup(chat: jest.Mock) {
  const ipc = new FakeIpcMain();
  new IpcRegistrar(ipc).register([new ChatHandler({ chat })]);

  return ipc;
}

describe('ChatHandler', () => {
  it('when chat:send is called, should pass the request to the service and answer its message', async () => {
    const chat = jest.fn().mockResolvedValue({ message: 'olá' });
    const ipc = setup(chat);

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: true,
      data: { message: 'olá' },
    });
    expect(chat).toHaveBeenCalledWith(request);
  });

  it('when thinking is omitted, should still forward the request untouched', async () => {
    const chat = jest.fn().mockResolvedValue({ message: 'x' });
    const ipc = setup(chat);
    const withoutThinking = { message: 'oi', modelId: 'm', providerId: 'gemini' as const };

    await ipc.invoke(IpcChannels.chat.send, withoutThinking);

    expect(chat).toHaveBeenCalledWith(withoutThinking);
  });

  it('when Ollama fails, should answer PROVIDER_FAILED keeping the message', async () => {
    const ipc = setup(
      jest.fn().mockRejectedValue(new Error('A requisição para o chat do Ollama falhou.')),
    );

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: false,
      error: { code: 'PROVIDER_FAILED', message: 'A requisição para o chat do Ollama falhou.' },
    });
  });

  it('when Gemini fails, should answer PROVIDER_FAILED keeping the message', async () => {
    const ipc = setup(
      jest.fn().mockRejectedValue(new Error('A requisição para o chat do Gemini falhou.')),
    );

    await expect(
      ipc.invoke(IpcChannels.chat.send, { ...request, providerId: 'gemini' }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'PROVIDER_FAILED', message: 'A requisição para o chat do Gemini falhou.' },
    });
  });

  it('when the provider is not configured, should answer NOT_CONFIGURED', async () => {
    const ipc = setup(
      jest
        .fn()
        .mockRejectedValue(
          new IpcError(IpcErrorCode.NOT_CONFIGURED, 'Chave da API do Gemini não configurada.'),
        ),
    );

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_CONFIGURED', message: 'Chave da API do Gemini não configurada.' },
    });
  });

  it('when the service rejects with something that is not an Error, should answer PROVIDER_FAILED with the default message', async () => {
    const ipc = setup(jest.fn().mockRejectedValue('quebrou'));

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: false,
      error: { code: 'PROVIDER_FAILED', message: 'Falha ao consultar o provider.' },
    });
  });
});
