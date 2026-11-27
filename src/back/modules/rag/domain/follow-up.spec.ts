import { isFollowUp } from './follow-up';

describe('isFollowUp', () => {
  it.each([
    'E a segunda?',
    'e a terceira?',
    'E isso?',
    'Pode dar um exemplo?',
    'Fale mais',
    'e o outro?',
  ])(
    'when the short question "%s" points back to the answer, should be a follow-up',
    (question) => {
      expect(isFollowUp(question)).toBe(true);
    },
  );

  it.each(['E sobre devops?', 'e telemetria?', 'Fale de kanban', 'oi, tudo bem?'])(
    'when the short question "%s" has a subject of its own, should not be a follow-up',
    (question) => {
      expect(isFollowUp(question)).toBe(false);
    },
  );

  it.each([
    'Vamos falar só sobre telemetria, temos algo assim?',
    'Mudando de assunto: e a segunda?',
    'Apenas sobre isso, por favor',
    'Quero falar de outro assunto',
  ])('when the user says the subject changed ("%s"), should not be a follow-up', (question) => {
    expect(isFollowUp(question)).toBe(false);
  });

  it('when the question is long, should not be a follow-up even if it points back', () => {
    expect(
      isFollowUp('Qual é a diferença entre a segunda maneira e as métricas de entrega contínua?'),
    ).toBe(false);
  });
});
