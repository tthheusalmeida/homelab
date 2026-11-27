import { IpcChannels } from '../../shared/channels';
import { IpcError, IpcErrorCode } from '../../shared/errors';
import { IpcEvents } from '../../shared/events';
import { IpcRegistrar } from '../ipc-registrar';
import { FakeEventPublisher } from '../testing/fake-event-publisher';
import { FakeIpcMain } from '../testing/fake-ipc-main';

import { ChatHandler, type ChatSource } from './chat.handler';

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

const request = {
  chatId: 'c1',
  message: 'oi',
  modelId: 'm',
  providerId: 'ollama' as const,
  thinking: 'off',
};

type Fakes = Record<keyof ChatSource, jest.Mock>;

function setup(overrides: Partial<Fakes> = {}) {
  const fakes: Fakes = {
    send: jest.fn().mockResolvedValue({ message: 'olá', chat: { id: 'c1' } }),
    cancel: jest.fn(),
    list: jest.fn().mockReturnValue([]),
    get: jest.fn().mockReturnValue({ id: 'c1', messages: [] }),
    delete: jest.fn(),
    ...overrides,
  };
  const ipc = new FakeIpcMain();
  new IpcRegistrar(ipc).register([new ChatHandler(fakes)]);

  return { ipc, fakes };
}

describe('ChatHandler: enviar', () => {
  it('when chat:send is called, should pass the request to the service and answer the message and the updated chat', async () => {
    const { ipc, fakes } = setup();

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: true,
      data: { message: 'olá', chat: { id: 'c1' } },
    });
    expect(fakes.send).toHaveBeenCalledWith(request, undefined);
  });

  it('when thinking is omitted, should still forward the request untouched', async () => {
    const { ipc, fakes } = setup();
    const withoutThinking = {
      chatId: 'c1',
      message: 'oi',
      modelId: 'm',
      providerId: 'gemini' as const,
    };

    await ipc.invoke(IpcChannels.chat.send, withoutThinking);

    expect(fakes.send).toHaveBeenCalledWith(withoutThinking, undefined);
  });

  it('when Ollama fails, should answer PROVIDER_FAILED keeping the message', async () => {
    const { ipc } = setup({
      send: jest.fn().mockRejectedValue(new Error('A requisição para o chat do Ollama falhou.')),
    });

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: false,
      error: { code: 'PROVIDER_FAILED', message: 'A requisição para o chat do Ollama falhou.' },
    });
  });

  it('when Gemini fails, should answer PROVIDER_FAILED keeping the message', async () => {
    const { ipc } = setup({
      send: jest.fn().mockRejectedValue(new Error('A requisição para o chat do Gemini falhou.')),
    });

    await expect(
      ipc.invoke(IpcChannels.chat.send, { ...request, providerId: 'gemini' }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'PROVIDER_FAILED', message: 'A requisição para o chat do Gemini falhou.' },
    });
  });

  it('when the provider is not configured, should answer NOT_CONFIGURED', async () => {
    const { ipc } = setup({
      send: jest
        .fn()
        .mockRejectedValue(
          new IpcError(IpcErrorCode.NOT_CONFIGURED, 'Chave da API do Gemini não configurada.'),
        ),
    });

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_CONFIGURED', message: 'Chave da API do Gemini não configurada.' },
    });
  });

  it('when the message is blank or the id invalid (400), should answer VALIDATION instead of blaming the provider', async () => {
    const { ipc } = setup({
      send: jest
        .fn()
        .mockRejectedValue(new HttpLikeError('Escreva uma mensagem antes de enviar.', 400)),
    });

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'Escreva uma mensagem antes de enviar.' },
    });
  });

  it('when the chat was deleted while the answer was generated (404), should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      send: jest.fn().mockRejectedValue(new HttpLikeError('O chat foi excluído.', 404)),
    });

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'O chat foi excluído.' },
    });
  });

  it('when the answer was cancelled (VALIDATION IpcError), should keep that code', async () => {
    const { ipc } = setup({
      send: jest
        .fn()
        .mockRejectedValue(new IpcError(IpcErrorCode.VALIDATION, 'A resposta foi cancelada.')),
    });

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: false,
      error: { code: 'VALIDATION', message: 'A resposta foi cancelada.' },
    });
  });

  it('when the service rejects with something that is not an Error, should answer PROVIDER_FAILED with the default message', async () => {
    const { ipc } = setup({ send: jest.fn().mockRejectedValue('quebrou') });

    await expect(ipc.invoke(IpcChannels.chat.send, request)).resolves.toEqual({
      ok: false,
      error: { code: 'PROVIDER_FAILED', message: 'Falha ao consultar o provider.' },
    });
  });
});

describe('ChatHandler: cancelar, listar, abrir e excluir', () => {
  it('when chat:cancel is called, should tell the service which chat to discard and answer ok', async () => {
    const { ipc, fakes } = setup();

    await expect(ipc.invoke(IpcChannels.chat.cancel, { chatId: 'c1' })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(fakes.cancel).toHaveBeenCalledWith('c1');
  });

  it('when chats:list is called, should answer the summaries from the service', async () => {
    const list = [{ id: 'c1', title: 'Oi', messageCount: 2 }];
    const { ipc } = setup({ list: jest.fn().mockReturnValue(list) });

    await expect(ipc.invoke(IpcChannels.chats.list)).resolves.toEqual({ ok: true, data: list });
  });

  it('when chats:get is called, should ask the service for that id and answer the chat', async () => {
    const chat = { id: 'c9', messages: [{ id: 'm1' }] };
    const { ipc, fakes } = setup({ get: jest.fn().mockReturnValue(chat) });

    await expect(ipc.invoke(IpcChannels.chats.get, { id: 'c9' })).resolves.toEqual({
      ok: true,
      data: chat,
    });
    expect(fakes.get).toHaveBeenCalledWith('c9');
  });

  it('when the chat does not exist (404), should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      get: jest.fn(() => {
        throw new HttpLikeError('Chat "x" não encontrado.', 404);
      }),
    });

    await expect(ipc.invoke(IpcChannels.chats.get, { id: 'x' })).resolves.toEqual({
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Chat "x" não encontrado.' },
    });
  });

  it('when chats:delete is called, should delete that chat and answer ok', async () => {
    const { ipc, fakes } = setup();

    await expect(ipc.invoke(IpcChannels.chats.delete, { id: 'c1' })).resolves.toEqual({
      ok: true,
      data: undefined,
    });
    expect(fakes.delete).toHaveBeenCalledWith('c1');
  });

  it('when deleting an unknown chat (404), should answer NOT_FOUND', async () => {
    const { ipc } = setup({
      delete: jest.fn(() => {
        throw new HttpLikeError('Chat "x" não encontrado.', 404);
      }),
    });

    await expect(ipc.invoke(IpcChannels.chats.delete, { id: 'x' })).resolves.toMatchObject({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });
});

describe('ChatHandler: resposta aos pedaços', () => {
  const setupWithEvents = (send: ChatSource['send']) => {
    const events = new FakeEventPublisher();
    const ipc = new FakeIpcMain();
    const source: ChatSource = {
      send,
      cancel: jest.fn(),
      list: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    };

    new IpcRegistrar(ipc).register([new ChatHandler(source, events)]);

    return { ipc, events };
  };

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('when the service writes pieces, should publish them as chat:chunk for that chat, in order and batched', async () => {
    const { ipc, events } = setupWithEvents(async (_request, onChunk) => {
      onChunk?.('Olá, ');
      onChunk?.('mundo');

      return { message: 'Olá, mundo', chat: { id: 'c1' } } as never;
    });

    await ipc.invoke(IpcChannels.chat.send, request);

    expect(events.payloadsOf(IpcEvents.chatChunk)).toEqual([{ chatId: 'c1', text: 'Olá, mundo' }]);
  });

  it('when the service fails, should drop the pieces that were waiting', async () => {
    const { ipc, events } = setupWithEvents(async (_request, onChunk) => {
      onChunk?.('metade');

      throw new Error('caiu');
    });

    await ipc.invoke(IpcChannels.chat.send, request);
    jest.advanceTimersByTime(1_000);

    expect(events.payloadsOf(IpcEvents.chatChunk)).toEqual([]);
  });

  it('when there is no event publisher, should not ask the service for pieces', async () => {
    const send = jest.fn().mockResolvedValue({ message: 'ok', chat: { id: 'c1' } });
    const ipc = new FakeIpcMain();

    new IpcRegistrar(ipc).register([
      new ChatHandler({
        send,
        cancel: jest.fn(),
        list: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
      }),
    ]);
    await ipc.invoke(IpcChannels.chat.send, request);

    expect(send).toHaveBeenCalledWith(request, undefined);
  });
});
