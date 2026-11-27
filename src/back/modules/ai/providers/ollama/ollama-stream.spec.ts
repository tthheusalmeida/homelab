import { readOllamaStream } from './ollama-stream';

async function* source(parts: string[]) {
  for (const part of parts) {
    yield Buffer.from(part);
  }
}

const line = (value: unknown) => JSON.stringify(value) + '\n';

describe('readOllamaStream', () => {
  it('when the reply comes in pieces, should hand each one over and join them', async () => {
    const chunks: string[] = [];
    const result = await readOllamaStream(
      source([
        line({ message: { content: 'Olá' } }),
        line({ message: { content: ', mundo' } }),
        line({ message: { content: '' }, done: true, prompt_eval_count: 7, eval_count: 3 }),
      ]),
      (text) => chunks.push(text),
    );

    expect(chunks).toEqual(['Olá', ', mundo']);
    expect(result).toEqual({ text: 'Olá, mundo', inputTokens: 7, outputTokens: 3 });
  });

  it('when a line is split between two network pieces, should still read it whole', async () => {
    const whole = line({ message: { content: 'inteiro' } });
    const chunks: string[] = [];

    await readOllamaStream(source([whole.slice(0, 10), whole.slice(10)]), (text) =>
      chunks.push(text),
    );

    expect(chunks).toEqual(['inteiro']);
  });

  it('when the model is thinking, should not put the thought in the reply', async () => {
    const chunks: string[] = [];

    await readOllamaStream(
      source([line({ message: { thinking: 'hmm' } }), line({ message: { content: 'ok' } })]),
      (text) => chunks.push(text),
    );

    expect(chunks).toEqual(['ok']);
  });

  it('when the stream reports an error, should throw it', async () => {
    await expect(
      readOllamaStream(source([line({ error: 'modelo não encontrado' })]), () => undefined),
    ).rejects.toThrow('modelo não encontrado');
  });

  it('when the last line has no line break, should read it too', async () => {
    const chunks: string[] = [];

    await readOllamaStream(source(['{"message":{"content":"fim"}}']), (text) => chunks.push(text));

    expect(chunks).toEqual(['fim']);
  });
});
