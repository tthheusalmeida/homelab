import { retryNote } from './retry-note';

describe('retryNote', () => {
  it('when the provider retries, should say the attempt, the total and the reason', () => {
    expect(
      retryNote({ attempt: 2, maxAttempts: 3, delayMs: 3000, reason: 'O Gemini está ocupado.' }),
    ).toBe('Tentando de novo (tentativa 2 de 3): O Gemini está ocupado.');
  });
});
