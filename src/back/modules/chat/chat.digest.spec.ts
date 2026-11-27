import type { ChatSendRequest } from '../../../shared/contracts/chat';
import type { AIService } from '../ai/ai.service';

import { ChatService } from './chat.service';
import { InMemoryChatRepository } from './in-memory-chat.repository';

const request = (overrides: Partial<ChatSendRequest> = {}): ChatSendRequest => ({
  chatId: 'chat-1',
  message: 'pergunta',
  modelId: 'm',
  providerId: 'ollama',
  // janela e modelo pequenos: o histórico passa do orçamento rápido
  contextLimit: 4_096,
  modelBillions: 2,
  ...overrides,
});

const long = (label: string) => `${label} ${'palavra '.repeat(400)}`;

describe('ChatService: resumo do começo da conversa', () => {
  let ai: { chat: jest.Mock };
  let repository: InMemoryChatRepository;
  let service: ChatService;

  /** Chamadas que são pedido de resumo (as demais são o chat). */
  const summaryCalls = () =>
    ai.chat.mock.calls.filter(([dto]) => String(dto.message).startsWith('Resuma a conversa'));

  const chatCalls = () => ai.chat.mock.calls.filter(([dto]) => dto.messages !== undefined);

  const fillChat = async (turns: number) => {
    for (let index = 0; index < turns; index += 1) {
      await service.send(request({ message: long(`p${index}`) }));
    }
  };

  beforeEach(() => {
    ai = {
      chat: jest.fn(async (dto: { message: string }) =>
        dto.message.startsWith('Resuma a conversa') ? 'RESUMO' : long('resposta'),
      ),
    };
    repository = new InMemoryChatRepository();
    service = new ChatService(ai as unknown as AIService, repository);
  });

  it('when the history is short, should never ask for a summary', async () => {
    await service.send(request());
    await service.send(request({ message: 'outra' }));

    expect(summaryCalls()).toHaveLength(0);
    expect(service.get('chat-1').digest).toBeUndefined();
  });

  it('when the history grows past what a small model handles, should summarize the old part and save it in the chat', async () => {
    await fillChat(6);

    expect(summaryCalls().length).toBeGreaterThan(0);

    const { digest, messages } = service.get('chat-1');

    expect(digest?.text).toBe('RESUMO');
    expect(digest!.upTo).toBeGreaterThan(0);
    // a tela continua com todas as mensagens
    expect(messages).toHaveLength(12);
  });

  it('when a summary exists, should send it first and only the messages it does not cover', async () => {
    await fillChat(6);

    const { digest } = service.get('chat-1');
    const lastSent = chatCalls().at(-1)![0].messages as Array<{ role: string; content: string }>;

    expect(lastSent[0].content).toContain('RESUMO');
    expect(lastSent[1].role).toBe('assistant');
    expect(lastSent).toHaveLength(2 + (10 - digest!.upTo) + 1);
  });

  it('when the history keeps growing, should fold the previous summary into the new one', async () => {
    await fillChat(8);

    const [laterRequest] = summaryCalls().at(-1)!;

    expect(summaryCalls().length).toBeGreaterThan(1);
    expect(laterRequest.message).toContain('Resumo anterior:\nRESUMO');
  });

  it('when the AI fails to summarize, should keep sending the whole history and still answer', async () => {
    ai.chat.mockImplementation(async (dto: { message: string }) => {
      if (dto.message.startsWith('Resuma a conversa')) {
        throw new Error('falhou');
      }

      return long('resposta');
    });

    await fillChat(6);

    expect(service.get('chat-1').digest).toBeUndefined();
    expect(service.get('chat-1').messages).toHaveLength(12);
  });

  it('when the model is big and the window is huge, should not summarize', async () => {
    for (let index = 0; index < 6; index += 1) {
      await service.send(
        request({ message: long(`p${index}`), contextLimit: 1_000_000, modelBillions: undefined }),
      );
    }

    expect(summaryCalls()).toHaveLength(0);
  });
});
