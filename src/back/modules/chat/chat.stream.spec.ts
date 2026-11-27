import type { ChatSendRequest } from '../../../shared/contracts/chat';
import type { AIService } from '../ai/ai.service';

import { ChatService } from './chat.service';
import { InMemoryChatRepository } from './in-memory-chat.repository';

const request = (overrides: Partial<ChatSendRequest> = {}): ChatSendRequest => ({
  chatId: 'chat-1',
  message: 'oi',
  modelId: 'm',
  providerId: 'ollama',
  ...overrides,
});

describe('ChatService: resposta aos pedaços e cancelamento', () => {
  let ai: { chat: jest.Mock };
  let service: ChatService;

  beforeEach(() => {
    ai = { chat: jest.fn() };
    service = new ChatService(ai as unknown as AIService, new InMemoryChatRepository());
  });

  it('when the caller wants the pieces, should hand them over as the provider writes and save the whole answer', async () => {
    ai.chat.mockImplementation(async (dto: { onChunk?: (text: string) => void }) => {
      dto.onChunk?.('Olá, ');
      dto.onChunk?.('mundo');

      return 'Olá, mundo';
    });
    const received: string[] = [];

    const { chat } = await service.send(request(), (text) => received.push(text));

    expect(received).toEqual(['Olá, ', 'mundo']);
    expect(chat.messages.at(-1)?.content).toBe('Olá, mundo');
  });

  it('when the caller does not want pieces, should not ask the provider to stream', async () => {
    ai.chat.mockResolvedValue('ok');

    await service.send(request());

    expect(ai.chat.mock.calls[0][0].onChunk).toBeUndefined();
  });

  it('when the answer is cancelled, should abort the provider call and drop what comes after', async () => {
    let signal: AbortSignal | undefined;
    let emit: ((text: string) => void) | undefined;

    ai.chat.mockImplementation(
      (dto: { signal: AbortSignal; onChunk: (text: string) => void }) =>
        new Promise((_resolve, reject) => {
          signal = dto.signal;
          emit = dto.onChunk;
          dto.signal.addEventListener('abort', () => reject(new Error('interrompido')));
        }),
    );
    const received: string[] = [];
    const sending = service.send(request(), (text) => received.push(text));

    await new Promise((resolve) => setImmediate(resolve));
    emit?.('antes');
    service.cancel('chat-1');
    emit?.('depois');

    await expect(sending).rejects.toThrow('cancelada');
    expect(signal?.aborted).toBe(true);
    expect(received).toEqual(['antes']);
    expect(service.list()).toEqual([]);
  });

  it('when a chat is cancelled that is not answering, should do nothing', () => {
    expect(() => service.cancel('nenhum')).not.toThrow();
  });
});
