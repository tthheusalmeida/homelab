import { abortError, execStreaming, isAbortError } from './exec-streaming';

const node = process.execPath;

describe('execStreaming', () => {
  it('when the program ends well, should resolve with stdout and stderr', async () => {
    const result = await execStreaming(node, ['-e', 'console.log("oi"); console.error("aviso")']);

    expect(result.stdout.trim()).toBe('oi');
    expect(result.stderr.trim()).toBe('aviso');
  });

  it('when the program writes while running, should hand each text to the listener', async () => {
    const chunks: string[] = [];

    await execStreaming(node, ['-e', 'console.log("a")'], (text) => chunks.push(text));

    expect(chunks.join('')).toContain('a');
  });

  it('when the program exits with an error code, should reject with its stdout and stderr', async () => {
    await expect(
      execStreaming(node, ['-e', 'console.error("ruim"); process.exit(3)']),
    ).rejects.toMatchObject({ code: 3, stderr: expect.stringContaining('ruim') });
  });

  it('when the signal is aborted while the program runs, should stop it and reject with AbortError', async () => {
    const controller = new AbortController();
    const started = Date.now();
    const running = execStreaming(
      node,
      ['-e', 'setInterval(() => {}, 1000)'],
      undefined,
      controller.signal,
    );

    setTimeout(() => controller.abort(), 200);

    await expect(running).rejects.toMatchObject({ name: 'AbortError' });
    expect(Date.now() - started).toBeLessThan(10_000);
  });

  it('when the signal was already aborted, should not even start the program', async () => {
    const controller = new AbortController();

    controller.abort();

    await expect(
      execStreaming(
        node,
        ['-e', 'require("fs").writeFileSync("nao-deve-existir.txt", "x")'],
        undefined,
        controller.signal,
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('isAbortError', () => {
  it('when the error comes from abortError, should be recognised', () => {
    expect(isAbortError(abortError())).toBe(true);
  });

  it('when the error is any other, should not be taken as a cancellation', () => {
    expect(isAbortError(new Error('falhou'))).toBe(false);
    expect(isAbortError('texto')).toBe(false);
  });
});
