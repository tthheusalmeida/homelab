import type { ChatSendRequest } from '../../../shared/contracts/chat';
import type { AIService } from '../ai/ai.service';

import {
  referencesFor,
  saysNotFound,
  withoutDeadEnds,
  type ChatContextPassage,
} from './chat-context';
import { ChatService } from './chat.service';
import { InMemoryChatRepository } from './in-memory-chat.repository';

const turn = (role: 'user' | 'assistant', content: string) => ({ role, content });

const passage = (overrides: Partial<ChatContextPassage> = {}): ChatContextPassage => ({
  documentId: 'doc-1',
  title: 'DORA',
  category: [],
  headingPath: ['DORA', 'Métricas'],
  anchor: 'metricas',
  text: 'O DORA mede quatro métricas.',
  ...overrides,
});

describe('saysNotFound: a negação precisa abrir a resposta', () => {
  it.each([
    'Não encontrei nada sobre isso nas suas páginas.',
    'Com base nos trechos fornecidos, **não encontrou** informações sobre isso.',
    'Baseado nos trechos fornecidos, **não foi possível encontrar** a resposta.',
    'Não há nada disso nas suas páginas.',
  ])('when the answer opens with "%s", should say it found nothing', (answer) => {
    expect(saysNotFound(answer)).toBe(true);
  });

  it.each([
    'Tenho informações sobre o modelo e as métricas do DORA nas suas páginas, mas não encontrei nada sobre receitas culinárias.',
    'O DORA mede quatro métricas, porém não encontrei o prazo de cada uma.',
    'Embora as páginas falem do tema, não encontrei esse detalhe.',
  ])('when a caveat comes before the denial ("%s"), should still count as an answer', (answer) => {
    expect(saysNotFound(answer)).toBe(false);
  });

  it('when the denial only shows up late in the first sentence, should not count it', () => {
    const answer = `${'O DORA reúne várias pesquisas sobre entrega de software e estabilidade, e '}não encontrei o prazo.`;

    expect(saysNotFound(answer)).toBe(false);
  });

  it('when the answer cites pages and also mentions a missing detail, should keep the references', () => {
    const answer =
      'Tenho informações sobre o DORA nas suas páginas, mas não encontrei nada sobre receitas [1].';

    expect(referencesFor(answer, [passage()])).toHaveLength(1);
  });
});

describe('withoutDeadEnds', () => {
  it('when a question was answered with "não encontrei", should drop the question and the answer', () => {
    const history = [
      turn('user', 'Qual a capital da França?'),
      turn('assistant', 'Não encontrei nada sobre isso nas suas páginas.'),
      turn('user', 'O que é DORA?'),
      turn('assistant', 'DORA é um grupo de pesquisa [1].'),
    ];

    expect(withoutDeadEnds(history)).toEqual(history.slice(2));
  });

  it('when every answer found something, should keep the whole history', () => {
    const history = [
      turn('user', 'O que é DORA?'),
      turn('assistant', 'DORA é um grupo de pesquisa [1].'),
    ];

    expect(withoutDeadEnds(history)).toEqual(history);
  });

  it('when several dead ends are mixed with good turns, should keep only the good ones in order', () => {
    const history = [
      turn('user', 'a'),
      turn('assistant', 'Não encontrei nada sobre isso nas suas páginas.'),
      turn('user', 'b'),
      turn('assistant', 'Resposta boa sobre b.'),
      turn('user', 'c'),
      turn('assistant', 'Não há nada disso nas suas páginas.'),
    ];

    expect(withoutDeadEnds(history).map((item) => item.content)).toEqual([
      'b',
      'Resposta boa sobre b.',
    ]);
  });

  it('when the history is empty, should stay empty', () => {
    expect(withoutDeadEnds([])).toEqual([]);
  });

  it('when a user message has no answer yet, should keep it', () => {
    expect(withoutDeadEnds([turn('user', 'oi')])).toEqual([turn('user', 'oi')]);
  });
});

describe('ChatService e os becos sem saída', () => {
  let ai: { chat: jest.Mock };
  let context: { retrieve: jest.Mock };
  let service: ChatService;

  const request = (message: string): ChatSendRequest => ({
    chatId: 'chat-1',
    message,
    modelId: 'm',
    providerId: 'ollama',
  });

  beforeEach(() => {
    ai = { chat: jest.fn() };
    context = { retrieve: jest.fn().mockResolvedValue([]) };
    service = new ChatService(ai as unknown as AIService, new InMemoryChatRepository(), context);
  });

  it('when the new question has relevant pages, should not send the old "não encontrei" turns to the model', async () => {
    ai.chat.mockResolvedValueOnce('Não encontrei nada sobre isso nas suas páginas.');
    await service.send(request('Qual a capital da França?'));

    context.retrieve.mockResolvedValue([passage()]);
    ai.chat.mockResolvedValueOnce('O DORA mede quatro métricas [1].');
    await service.send(request('O que você tem de DORA?'));

    const sent = (ai.chat.mock.calls[1][0] as { messages: Array<{ role: string }> }).messages;

    expect(sent).toHaveLength(1);
    expect(sent[0].role).toBe('user');
  });

  it('when the new question has no pages either, should keep the whole history so the talk stays coherent', async () => {
    ai.chat.mockResolvedValueOnce('Não encontrei nada sobre isso nas suas páginas.');
    await service.send(request('Qual a capital da França?'));

    ai.chat.mockResolvedValueOnce('Paris.');
    await service.send(request('E da Itália?'));

    const sent = (ai.chat.mock.calls[1][0] as { messages: unknown[] }).messages;

    expect(sent).toHaveLength(3);
  });

  it('when old turns are left out of what the model receives, should keep every turn in the saved chat', async () => {
    ai.chat.mockResolvedValueOnce('Não encontrei nada sobre isso nas suas páginas.');
    await service.send(request('Qual a capital da França?'));

    context.retrieve.mockResolvedValue([passage()]);
    ai.chat.mockResolvedValueOnce('O DORA mede quatro métricas [1].');

    const { chat } = await service.send(request('O que você tem de DORA?'));

    expect(chat.messages).toHaveLength(4);
    expect(chat.messages[1].content).toBe('Não encontrei nada sobre isso nas suas páginas.');
  });
});

describe('referencesFor: citação dentro de frase que nega as páginas', () => {
  const passages = [
    passage(),
    passage({ documentId: 'doc-2', title: 'Scrum', anchor: 'scrum' }),
    passage({ documentId: 'doc-3', title: 'XP', anchor: 'xp' }),
  ];

  it('when a small model cites pages only to say they hold nothing, should list no reference', () => {
    const answer =
      'A capital da França é Paris. Não há nenhuma informação sobre geografia ou capitais na lista [1], [2] ou [3].';

    expect(referencesFor(answer, passages)).toEqual([]);
  });

  it('when the cited section is said not to cover the subject in the same sentence, should drop that citation', () => {
    const answer =
      'Para fazer um bolo, siga o método da seção [1], mas note que ele não cobre receitas específicas.';

    expect(referencesFor(answer, passages)).toEqual([]);
  });

  it('when only some citations sit in negating sentences, should keep the others', () => {
    const answer =
      'O DORA mede quatro métricas [1]. Não há informação sobre o prazo nos trechos [2].';

    // só [1] vale: o [2] está numa frase que diz que o trecho não serve
    expect(referencesFor(answer, passages).map((reference) => reference.documentId)).toEqual([
      'doc-1',
    ]);
  });

  it('when a sentence denies something unrelated to the pages, should keep its citation', () => {
    const answer = 'Não há uma definição única de DevOps [3], e o termo varia entre autores.';

    expect(referencesFor(answer, passages).map((reference) => reference.documentId)).toEqual([
      'doc-3',
    ]);
  });

  it('when a sentence says no excerpt mentions the topic, should not count its citation', () => {
    expect(referencesFor('Nenhum trecho menciona isso [2].', passages)).toEqual([]);
  });

  it('when the answer has no denial at all, should behave as before', () => {
    expect(referencesFor('Fala do DORA [1] e do Scrum [2].', passages)).toHaveLength(2);
  });
});

describe('saysNotFound: negação genérica não é "não achei"', () => {
  it('when the answer opens with a plain "não há" about something else, should not count as not found', () => {
    expect(saysNotFound('Não há uma definição única de DevOps [3], e o termo varia.')).toBe(false);
  });

  it.each([
    'Não há informações sobre isso nas suas páginas.',
    'Não há nada disso nas suas páginas.',
    'Não tenho nenhum registro disso.',
    'Não consta nos trechos fornecidos.',
  ])('when the answer opens with "%s", should still count as not found', (answer) => {
    expect(saysNotFound(answer)).toBe(true);
  });
});
