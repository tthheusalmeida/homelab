import type { ChatSendRequest } from '../../../shared/contracts/chat';
import type { AIService } from '../ai/ai.service';

import type { ChatContextPassage } from './chat-context';
import { ChatService } from './chat.service';
import { InMemoryChatRepository } from './in-memory-chat.repository';

const request = (overrides: Partial<ChatSendRequest> = {}): ChatSendRequest => ({
  chatId: 'chat-1',
  message: 'o que diz a primeira maneira do devops?',
  modelId: 'm',
  providerId: 'ollama',
  ...overrides,
});

const passage = (overrides: Partial<ChatContextPassage> = {}): ChatContextPassage => ({
  documentId: 'doc-1',
  title: 'Práticas da Primeira Maneira',
  category: ['DevOps'],
  headingPath: ['Práticas da Primeira Maneira', 'Fluxo de trabalho'],
  anchor: 'fluxo-de-trabalho',
  text: 'A Primeira Maneira enfatiza o fluxo.',
  ...overrides,
});

describe('ChatService com as páginas da biblioteca', () => {
  let ai: { chat: jest.Mock };
  let context: { retrieve: jest.Mock; searchedByWordsOnly: jest.Mock };
  let repository: InMemoryChatRepository;
  let service: ChatService;

  beforeEach(() => {
    ai = { chat: jest.fn().mockResolvedValue('Enfatiza o fluxo [1].') };
    context = {
      retrieve: jest.fn().mockResolvedValue([passage()]),
      searchedByWordsOnly: jest.fn().mockReturnValue(false),
    };
    repository = new InMemoryChatRepository();
    service = new ChatService(ai as unknown as AIService, repository, context);
  });

  it('when pages match the question, should send the model the numbered excerpts plus the question', async () => {
    await service.send(request());

    const [{ messages }] = ai.chat.mock.calls[0];

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toContain('[1] Práticas da Primeira Maneira › Fluxo de trabalho');
    expect(messages[0].content).toContain('Pergunta: o que diz a primeira maneira do devops?');
  });

  it('when pages match the question, should store the question as the user wrote it, without the excerpts', async () => {
    const { chat } = await service.send(request());

    expect(chat.messages[0]).toMatchObject({
      role: 'user',
      content: 'o que diz a primeira maneira do devops?',
    });
  });

  it('when the answer cites a page, should store the reference on the assistant message', async () => {
    const { chat } = await service.send(request());

    expect(chat.messages[1].references).toEqual([
      {
        documentId: 'doc-1',
        title: 'Práticas da Primeira Maneira',
        headingPath: ['Práticas da Primeira Maneira', 'Fluxo de trabalho'],
        anchor: 'fluxo-de-trabalho',
        category: ['DevOps'],
        number: 1,
      },
    ]);
    expect(chat.messages[0].references).toBeUndefined();
  });

  it('when the answer cites a page, should save and return the mark in bold', async () => {
    const result = await service.send(request());

    expect(result.message).toBe('Enfatiza o fluxo **[1]**.');
    expect(result.chat.messages[1].content).toBe('Enfatiza o fluxo **[1]**.');
  });

  it('when no page matches, should leave the answer text untouched', async () => {
    context.retrieve.mockResolvedValue([]);
    ai.chat.mockResolvedValue('O índice [1] do array.');

    const result = await service.send(request());

    expect(result.message).toBe('O índice [1] do array.');
  });

  it('when no page matches, should send the plain question and store no references', async () => {
    context.retrieve.mockResolvedValue([]);

    const { chat } = await service.send(request({ message: 'oi' }));

    expect(ai.chat.mock.calls[0][0].messages).toEqual([{ role: 'user', content: 'oi' }]);
    expect(chat.messages[1]).not.toHaveProperty('references');
  });

  it('when no page is used and the search looked only at the words, should flag the answer', async () => {
    context.retrieve.mockResolvedValue([]);
    context.searchedByWordsOnly.mockReturnValue(true);

    const { chat } = await service.send(request());

    expect(chat.messages[1]).toMatchObject({ searchedByWordsOnly: true });
  });

  it('when pages are used, should not flag the answer even if the search used only words', async () => {
    context.searchedByWordsOnly.mockReturnValue(true);

    const { chat } = await service.send(request());

    expect(chat.messages[1]).not.toHaveProperty('searchedByWordsOnly');
  });

  it('when no page is used but the meaning search worked, should not flag the answer', async () => {
    context.retrieve.mockResolvedValue([]);

    const { chat } = await service.send(request());

    expect(chat.messages[1]).not.toHaveProperty('searchedByWordsOnly');
  });

  it('when the user message is never flagged, should keep the flag off the question', async () => {
    context.retrieve.mockResolvedValue([]);
    context.searchedByWordsOnly.mockReturnValue(true);

    const { chat } = await service.send(request());

    expect(chat.messages[0]).not.toHaveProperty('searchedByWordsOnly');
  });

  it('when the search fails, should still answer the question without pages', async () => {
    context.retrieve.mockRejectedValue(new Error('índice quebrado'));

    const { message, chat } = await service.send(request({ message: 'oi' }));

    expect(message).toBe('Enfatiza o fluxo [1].');
    expect(chat.messages[1]).not.toHaveProperty('references');
  });

  it('when there is a previous question in the chat, should hand it to the search', async () => {
    await service.send(request({ message: 'primeira pergunta' }));
    await service.send(request({ message: 'e a segunda?' }));

    expect(context.retrieve).toHaveBeenLastCalledWith('e a segunda?', 'primeira pergunta', {
      contextLimit: undefined,
    });
  });

  it('when it is the first question, should search with no previous question', async () => {
    await service.send(request({ message: 'primeira pergunta' }));

    expect(context.retrieve).toHaveBeenCalledWith('primeira pergunta', undefined, {
      contextLimit: undefined,
    });
  });

  it('when a later question goes out, should resend the history with no old excerpts and no old citation marks', async () => {
    await service.send(request({ message: 'p1' }));
    await service.send(request({ message: 'p2' }));

    const sent = ai.chat.mock.calls[1][0].messages;

    expect(sent[0]).toEqual({ role: 'user', content: 'p1' });
    expect(sent[1]).toEqual({ role: 'assistant', content: 'Enfatiza o fluxo.' });
  });

  it('when the service has no context source, should behave as a plain chat', async () => {
    const plain = new ChatService(ai as unknown as AIService, new InMemoryChatRepository());

    const { chat } = await plain.send(request({ message: 'oi' }));

    expect(ai.chat.mock.calls[0][0].messages).toEqual([{ role: 'user', content: 'oi' }]);
    expect(chat.messages[1]).not.toHaveProperty('references');
  });

  it('when the user cancels, should not store the references either', async () => {
    let release!: (value: string) => void;

    ai.chat.mockReturnValue(new Promise<string>((resolve) => (release = resolve)));

    const pending = service.send(request());

    await Promise.resolve();
    await Promise.resolve();
    service.cancel('chat-1');
    release('resposta');

    await expect(pending).rejects.toBeDefined();
    expect(repository.findById('chat-1')).toBeNull();
  });
});

describe('ChatService: janela do modelo e respostas sem fonte', () => {
  let ai: { chat: jest.Mock };
  let context: { retrieve: jest.Mock };
  let service: ChatService;

  beforeEach(() => {
    ai = { chat: jest.fn().mockResolvedValue('Enfatiza o fluxo [1].') };
    context = { retrieve: jest.fn().mockResolvedValue([passage()]) };
    service = new ChatService(ai as unknown as AIService, new InMemoryChatRepository(), context);
  });

  it('when the screen knows the model window, should hand it to the search', async () => {
    await service.send(request({ contextLimit: 262144 }));

    expect(context.retrieve).toHaveBeenCalledWith(expect.any(String), undefined, {
      contextLimit: 262144,
    });
  });

  it('when the screen knows the model size, should hand it to the search too', async () => {
    await service.send(request({ contextLimit: 262144, modelBillions: 0.8 }));

    expect(context.retrieve).toHaveBeenCalledWith(expect.any(String), undefined, {
      contextLimit: 262144,
      modelBillions: 0.8,
    });
  });

  it('when the answer opens saying it found nothing, should not store references even if it cites', async () => {
    ai.chat.mockResolvedValue('Não encontrei isso nas páginas [1].');

    const { chat } = await service.send(request());

    expect(chat.messages[1]).not.toHaveProperty('references');
  });

  it('when the answer brings content and then a caveat, should keep the references', async () => {
    ai.chat.mockResolvedValue('Enfatiza o fluxo [1]. Não encontrei detalhes sobre o prazo.');

    const { chat } = await service.send(request());

    expect(chat.messages[1].references).toHaveLength(1);
  });

  it('when the answer is stored, should keep its citation marks, in bold, for the screen', async () => {
    const { chat } = await service.send(request());

    expect(chat.messages[1].content).toBe('Enfatiza o fluxo **[1]**.');
  });
});
