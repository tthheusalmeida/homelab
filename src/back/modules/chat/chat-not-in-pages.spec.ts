import type { ChatSendRequest } from '../../../shared/contracts/chat';
import type { AIService } from '../ai/ai.service';

import type { ChatContextPassage } from './chat-context';
import { ChatService } from './chat.service';
import { InMemoryChatRepository } from './in-memory-chat.repository';

const request = (message: string): ChatSendRequest => ({
  chatId: 'chat-1',
  message,
  modelId: 'm',
  providerId: 'ollama',
});

const passage = (): ChatContextPassage => ({
  documentId: 'doc-1',
  title: 'DORA',
  category: [],
  headingPath: ['DORA', 'Métricas'],
  anchor: 'metricas',
  text: 'O DORA mede quatro métricas.',
});

describe('ChatService: "não achei isso nas suas páginas"', () => {
  let ai: { chat: jest.Mock };
  let context: { retrieve: jest.Mock };
  let service: ChatService;

  beforeEach(() => {
    ai = { chat: jest.fn().mockResolvedValue('Resposta qualquer.') };
    context = { retrieve: jest.fn().mockResolvedValue([]) };
    service = new ChatService(ai as unknown as AIService, new InMemoryChatRepository(), context);
  });

  it('when a real question gets no page as reference, should flag the answer so the screen can say it', async () => {
    const { chat } = await service.send(request('Qual a capital da França hoje?'));

    expect(chat.messages[1].notInPages).toBe(true);
    expect(chat.messages[0]).not.toHaveProperty('notInPages');
  });

  it('when the model got excerpts but cited none of them, should still flag the answer', async () => {
    context.retrieve.mockResolvedValue([passage()]);

    const { chat } = await service.send(request('Como faço um bolo de chocolate?'));

    expect(chat.messages[1].notInPages).toBe(true);
  });

  it('when the answer cites a page, should not flag it', async () => {
    context.retrieve.mockResolvedValue([passage()]);
    ai.chat.mockResolvedValue('O DORA mede quatro métricas [1].');

    const { chat } = await service.send(request('O que o DORA mede nas métricas?'));

    expect(chat.messages[1]).not.toHaveProperty('notInPages');
    expect(chat.messages[1].references).toHaveLength(1);
  });

  it('when the message is only conversation, should not flag it as a failed search', async () => {
    const { chat } = await service.send(request('Oi, tudo bem?'));

    expect(chat.messages[1]).not.toHaveProperty('notInPages');
  });

  it('when the service has no page source at all, should never flag', async () => {
    const plain = new ChatService(ai as unknown as AIService, new InMemoryChatRepository());

    const { chat } = await plain.send(request('Qual a capital da França hoje?'));

    expect(chat.messages[1]).not.toHaveProperty('notInPages');
  });

  it('when the answer opens saying it found nothing yet cites a page, should flag it and drop the references', async () => {
    context.retrieve.mockResolvedValue([passage()]);
    ai.chat.mockResolvedValue('Não encontrei isso nas páginas [1].');

    const { chat } = await service.send(request('Como faço um bolo de chocolate?'));

    expect(chat.messages[1].notInPages).toBe(true);
    expect(chat.messages[1]).not.toHaveProperty('references');
  });
});
