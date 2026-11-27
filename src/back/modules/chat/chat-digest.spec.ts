import { digestPrompt, digestTurns, historyTurns } from './chat-digest';

const talk = [
  { role: 'user' as const, content: 'O que é CI?' },
  { role: 'assistant' as const, content: 'É integração contínua [1].' },
  { role: 'user' as const, content: 'E CD?' },
  { role: 'assistant' as const, content: 'Entrega contínua.' },
];

describe('historyTurns', () => {
  it('when there is no digest, should send every message without old citation marks', () => {
    expect(historyTurns(talk)).toEqual([
      talk[0],
      { role: 'assistant', content: 'É integração contínua.' },
      talk[2],
      talk[3],
    ]);
  });

  it('when a digest covers the first messages, should send only the rest', () => {
    expect(historyTurns(talk, { text: 'x', upTo: 2 })).toEqual([talk[2], talk[3]]);
  });
});

describe('digestTurns', () => {
  it('when there is no digest, should add nothing', () => {
    expect(digestTurns(undefined)).toEqual([]);
  });

  it('when there is a digest, should open the conversation with it as a user/assistant pair', () => {
    const turns = digestTurns({ text: 'Falamos de CI.', upTo: 2 });

    expect(turns.map(({ role }) => role)).toEqual(['user', 'assistant']);
    expect(turns[0].content).toContain('Falamos de CI.');
  });
});

describe('digestPrompt', () => {
  it('when there is a previous digest, should carry it with the new turns', () => {
    const prompt = digestPrompt('Antes: CI.', talk.slice(2));

    expect(prompt).toContain('Resumo anterior:\nAntes: CI.');
    expect(prompt).toContain('Usuário: E CD?');
    expect(prompt).toContain('Assistente: Entrega contínua.');
  });

  it('when an answer is very long, should clip it', () => {
    const prompt = digestPrompt(undefined, [{ role: 'assistant', content: 'a'.repeat(5_000) }]);

    expect(prompt.length).toBeLessThan(2_200);
  });
});
