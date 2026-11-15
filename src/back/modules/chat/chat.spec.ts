import { BadRequestException, NotFoundException } from '@nestjs/common';

import type { ChatSendRequest } from '../../../shared/contracts/chat';
import { IpcError } from '../../../shared/errors';
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

/** Resposta controlada à mão: permite testar o que acontece enquanto o provedor ainda responde. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('ChatService', () => {
  let ai: { chat: jest.Mock };
  let repository: InMemoryChatRepository;
  let service: ChatService;

  beforeEach(() => {
    ai = { chat: jest.fn().mockResolvedValue('resposta') };
    repository = new InMemoryChatRepository();
    service = new ChatService(ai as unknown as AIService, repository);
  });

  describe('send: primeira mensagem', () => {
    it('when the chat does not exist yet, should create it with the question and the answer, titled by the question', async () => {
      const result = await service.send(request({ message: '  Como funciona   o DNS?  ' }));

      expect(result.message).toBe('resposta');
      expect(result.chat).toMatchObject({
        id: 'chat-1',
        title: 'Como funciona o DNS?',
        providerId: 'ollama',
        modelId: 'm',
        messageCount: 2,
      });
      expect(result.chat.messages.map(({ role, content }) => [role, content])).toEqual([
        // o conteúdo mantém os espaços do usuário; só o título é normalizado
        ['user', 'Como funciona   o DNS?'],
        ['assistant', 'resposta'],
      ]);
      expect(repository.findById('chat-1')).toEqual(result.chat);
    });

    it('when the first message goes out, should send only that message to the provider (no history yet)', async () => {
      await service.send(request());

      expect(ai.chat).toHaveBeenCalledWith({
        message: 'oi',
        modelId: 'm',
        providerId: 'ollama',
        thinking: undefined,
        messages: [{ role: 'user', content: 'oi' }],
      });
    });

    it('when the chat is created, should give every message its own id and the same creation date', async () => {
      const { chat } = await service.send(request());

      expect(new Set(chat.messages.map((message) => message.id)).size).toBe(2);
      expect(chat.createdAt).toBe(chat.updatedAt);
    });
  });

  describe('send: conversa em andamento', () => {
    it('when the chat already has messages, should resend the whole history plus the new message, in order', async () => {
      ai.chat.mockResolvedValueOnce('r1').mockResolvedValueOnce('r2').mockResolvedValueOnce('r3');

      await service.send(request({ message: 'p1' }));
      await service.send(request({ message: 'p2' }));
      await service.send(request({ message: 'p3' }));

      expect(ai.chat.mock.calls[2][0].messages).toEqual([
        { role: 'user', content: 'p1' },
        { role: 'assistant', content: 'r1' },
        { role: 'user', content: 'p2' },
        { role: 'assistant', content: 'r2' },
        { role: 'user', content: 'p3' },
      ]);
    });

    it('when sending again, should append to the same chat, keeping the title and creation date', async () => {
      const first = await service.send(request({ message: 'primeira' }));
      const second = await service.send(request({ message: 'segunda' }));

      expect(second.chat.title).toBe('primeira');
      expect(second.chat.createdAt).toBe(first.chat.createdAt);
      expect(second.chat.messageCount).toBe(4);
      expect(second.chat.messages).toHaveLength(4);
    });

    it('when sending with another provider, model or thinking, should remember the last ones in the chat', async () => {
      await service.send(request());
      const { chat } = await service.send(
        request({ providerId: 'gemini', modelId: 'g', thinking: 'on' }),
      );

      expect(chat).toMatchObject({ providerId: 'gemini', modelId: 'g', thinking: 'on' });
    });

    it('when the provider is told the model, should forward thinking and the chosen model to the AI service', async () => {
      await service.send(request({ providerId: 'gemini', modelId: 'g', thinking: 'on' }));

      expect(ai.chat).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: 'gemini', modelId: 'g', thinking: 'on' }),
      );
    });
  });

  describe('send: falhas', () => {
    it('when the provider fails on the first message, should rethrow and create no chat at all', async () => {
      ai.chat.mockRejectedValue(new Error('A requisição para o chat do Ollama falhou.'));

      await expect(service.send(request())).rejects.toThrow('falhou');

      expect(repository.findAll()).toEqual([]);
    });

    it('when the provider fails on a later message, should leave the chat exactly as it was', async () => {
      await service.send(request({ message: 'p1' }));
      const before = repository.findById('chat-1');

      ai.chat.mockRejectedValue(new Error('rede'));
      await expect(service.send(request({ message: 'p2' }))).rejects.toThrow('rede');

      expect(repository.findById('chat-1')).toEqual(before);
    });

    it('when the provider failed, should allow sending again (the chat is not left busy)', async () => {
      ai.chat.mockRejectedValueOnce(new Error('rede'));
      await expect(service.send(request())).rejects.toThrow('rede');

      await expect(service.send(request())).resolves.toMatchObject({ message: 'resposta' });
    });

    it('when the message is blank, should reject with a validation error and not call the provider', async () => {
      await expect(service.send(request({ message: '   ' }))).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(ai.chat).not.toHaveBeenCalled();
    });

    it.each(['', 'com espaço', '../fuga', 'a'.repeat(101)])(
      'when the chat id is %p, should reject as invalid',
      async (chatId) => {
        await expect(service.send(request({ chatId }))).rejects.toBeInstanceOf(BadRequestException);
      },
    );

    it('when a second message is sent while the first still waits, should refuse with "busy" and not call the provider twice', async () => {
      const pending = deferred<string>();

      ai.chat.mockReturnValueOnce(pending.promise);
      const first = service.send(request({ message: 'p1' }));

      await expect(service.send(request({ message: 'p2' }))).rejects.toThrow(
        /resposta sendo gerada/,
      );
      expect(ai.chat).toHaveBeenCalledTimes(1);

      pending.resolve('r1');
      await first;
    });

    it('when two different chats are answered at the same time, should not block each other', async () => {
      const pending = deferred<string>();

      ai.chat.mockReturnValueOnce(pending.promise);
      const first = service.send(request({ chatId: 'a' }));
      const second = await service.send(request({ chatId: 'b' }));

      expect(second.chat.id).toBe('b');

      pending.resolve('tarde');
      await first;
      expect(repository.findAll()).toHaveLength(2);
    });
  });

  describe('cancel', () => {
    it('when cancelled while waiting, should discard the answer, save nothing and reject as cancelled', async () => {
      const pending = deferred<string>();

      ai.chat.mockReturnValueOnce(pending.promise);
      const sending = service.send(request());

      service.cancel('chat-1');
      pending.resolve('resposta que ninguém vai ver');

      await expect(sending).rejects.toBeInstanceOf(IpcError);
      await expect(sending).rejects.toMatchObject({ code: 'VALIDATION' });
      expect(repository.findAll()).toEqual([]);
    });

    it('when cancelled on an existing chat, should keep the previous messages untouched', async () => {
      await service.send(request({ message: 'p1' }));
      const before = repository.findById('chat-1');
      const pending = deferred<string>();

      ai.chat.mockReturnValueOnce(pending.promise);
      const sending = service.send(request({ message: 'p2' }));

      service.cancel('chat-1');
      pending.resolve('x');
      await expect(sending).rejects.toThrow(/cancelada/);

      expect(repository.findById('chat-1')).toEqual(before);
    });

    it('when nothing is being answered, should do nothing and not affect the next message', async () => {
      service.cancel('chat-1');

      await expect(service.send(request())).resolves.toMatchObject({ message: 'resposta' });
    });

    it('when a cancelled chat is sent to again, should work normally', async () => {
      const pending = deferred<string>();

      ai.chat.mockReturnValueOnce(pending.promise);
      const first = service.send(request());

      service.cancel('chat-1');
      pending.resolve('x');
      await expect(first).rejects.toThrow(/cancelada/);

      await expect(service.send(request({ message: 'outra' }))).resolves.toMatchObject({
        message: 'resposta',
      });
    });
  });

  describe('delete while waiting', () => {
    it('when an existing chat is deleted while the answer is being generated, should not bring it back', async () => {
      await service.send(request({ message: 'p1' }));
      const pending = deferred<string>();

      ai.chat.mockReturnValueOnce(pending.promise);
      const sending = service.send(request({ message: 'p2' }));

      service.delete('chat-1');
      pending.resolve('r2');

      await expect(sending).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.findAll()).toEqual([]);
    });
  });

  describe('list, get e delete', () => {
    it('when listing, should answer summaries (no messages) from the most recently updated', async () => {
      await service.send(request({ chatId: 'velho', message: 'antigo' }));
      await new Promise((resolve) => setTimeout(resolve, 5));
      await service.send(request({ chatId: 'novo', message: 'recente' }));

      const list = service.list();

      expect(list.map((chat) => chat.id)).toEqual(['novo', 'velho']);
      expect(list[0]).not.toHaveProperty('messages');
      expect(list[0]).toMatchObject({ title: 'recente', messageCount: 2 });
    });

    it('when a chat gets a new message, should move to the top of the list', async () => {
      await service.send(request({ chatId: 'a', message: 'a' }));
      await new Promise((resolve) => setTimeout(resolve, 5));
      await service.send(request({ chatId: 'b', message: 'b' }));
      await new Promise((resolve) => setTimeout(resolve, 5));
      await service.send(request({ chatId: 'a', message: 'de novo' }));

      expect(service.list().map((chat) => chat.id)).toEqual(['a', 'b']);
    });

    it('when listing without chats, should answer an empty list', () => {
      expect(service.list()).toEqual([]);
    });

    it('when getting a chat, should answer it with all its messages', async () => {
      await service.send(request());

      expect(service.get('chat-1').messages).toHaveLength(2);
    });

    it('when getting an unknown chat, should throw NotFoundException', () => {
      expect(() => service.get('nope')).toThrow(NotFoundException);
    });

    it('when the caller changes what get returned, should not change the stored chat', async () => {
      await service.send(request());

      service.get('chat-1').messages.pop();

      expect(service.get('chat-1').messages).toHaveLength(2);
    });

    it('when deleting a chat, should remove it and keep the others', async () => {
      await service.send(request({ chatId: 'a' }));
      await service.send(request({ chatId: 'b' }));

      service.delete('a');

      expect(service.list().map((chat) => chat.id)).toEqual(['b']);
    });

    it('when deleting an unknown chat, should throw NotFoundException', () => {
      expect(() => service.delete('nope')).toThrow(NotFoundException);
    });
  });

  describe('backup: exportar e importar', () => {
    const stored = (id: string) => ({
      id,
      title: `Conversa ${id}`,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-01-01T10:00:00.000Z',
      providerId: 'ollama' as const,
      modelId: 'm',
      messageCount: 1,
      messages: [
        {
          id: `${id}-1`,
          role: 'user' as const,
          content: 'oi',
          createdAt: '2026-01-01T10:00:00.000Z',
        },
      ],
    });

    it('when exporting, should answer every chat with its messages', async () => {
      await service.send(request({ chatId: 'a' }));

      const exported = service.exportChats();

      expect(exported).toHaveLength(1);
      expect(exported[0].messages).toHaveLength(2);
    });

    it('when merging, should add the missing chats and keep the existing ones as they are', async () => {
      await service.send(request({ chatId: 'a', message: 'meu' }));

      const result = service.importChats(
        [{ ...stored('a'), title: 'do backup' }, stored('b'), { id: 5 }],
        'merge',
      );

      expect(result).toEqual({ added: 1, skipped: 2 });
      expect(service.get('a').title).toBe('meu');
      expect(service.get('b').title).toBe('Conversa b');
    });

    it('when replacing, should swap every chat for the ones in the backup', async () => {
      await service.send(request({ chatId: 'a' }));

      const result = service.importChats([stored('b'), stored('c')], 'replace');

      expect(result).toEqual({ added: 2, skipped: 0 });
      expect(
        service
          .list()
          .map((chat) => chat.id)
          .sort(),
      ).toEqual(['b', 'c']);
    });

    it('when replacing while a chat waits for an answer, should keep that chat', async () => {
      await service.send(request({ chatId: 'a', message: 'p1' }));
      const pending = deferred<string>();

      ai.chat.mockReturnValueOnce(pending.promise);
      const sending = service.send(request({ chatId: 'a', message: 'p2' }));

      service.importChats([stored('b')], 'replace');
      pending.resolve('r2');
      await sending;

      expect(
        service
          .list()
          .map((chat) => chat.id)
          .sort(),
      ).toEqual(['a', 'b']);
      expect(service.get('a').messages).toHaveLength(4);
    });
  });
});
