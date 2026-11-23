import { AiUsageService } from '../../usage/ai-usage.service';

import { type ChatAnswer, type ChatBackend, runResilientChat } from './resilient-chat';
import { ModelCatalog } from './model-catalog';

const catalog = ModelCatalog.flat(
  new Map([
    ['barato', { inputPerMillionTokens: 1, outputPerMillionTokens: 1 }],
    ['caro', { inputPerMillionTokens: 10, outputPerMillionTokens: 10 }],
  ]),
);

const answer = (text = 'resp', inputTokens = 1_000_000, outputTokens = 1_000_000): ChatAnswer => ({
  text,
  inputTokens,
  outputTokens,
});

describe('runResilientChat', () => {
  let usage: AiUsageService;
  let backend: ChatBackend;
  const attempt = jest.fn();
  const sleep = jest.fn().mockResolvedValue(undefined);
  const ensureReady = jest.fn();

  const transient = () => Object.assign(new Error('passageiro'), { status: 503 });
  const fatal = () => Object.assign(new Error('fatal'), { status: 401 });

  beforeEach(() => {
    usage = new AiUsageService();
    attempt.mockReset();
    sleep.mockClear();
    ensureReady.mockReset();
    backend = {
      name: 'gemini',
      catalog,
      maxAttempts: 3,
      retryDelaysMs: [10, 20],
      sleep,
      ensureReady,
      normalizeModel: (model) => model.replace(/^models\//, ''),
      classify: (error) => ({
        retryable: (error as { status?: number }).status === 503,
        message: `motivo ${(error as { status?: number }).status}`,
      }),
      attempt,
    };
  });

  it('when the attempt works, should return the text, normalize the model and record usage with cost', async () => {
    attempt.mockResolvedValue(answer());

    await expect(
      runResilientChat(backend, usage, { message: 'a', model: 'models/caro' }),
    ).resolves.toBe('resp');

    expect(attempt).toHaveBeenCalledWith('caro', expect.objectContaining({ message: 'a' }));
    expect(usage.getUsage().recentRequests[0]).toMatchObject({
      provider: 'gemini',
      model: 'caro',
      success: true,
      totalTokens: 2_000_000,
      estimatedCost: 20,
    });
  });

  it('when the provider reports a total, should record that total', async () => {
    attempt.mockResolvedValue({ ...answer(), totalTokens: 7 });

    await runResilientChat(backend, usage, { message: 'a', model: 'caro' });

    expect(usage.getUsage().recentRequests[0].totalTokens).toBe(7);
  });

  it('when the provider is not ready, should record the failure and rethrow without trying', async () => {
    ensureReady.mockImplementation(() => {
      throw new Error('sem chave');
    });

    await expect(runResilientChat(backend, usage, { message: 'a', model: 'caro' })).rejects.toThrow(
      'sem chave',
    );

    expect(attempt).not.toHaveBeenCalled();
    expect(usage.getUsage().recentRequests[0]).toMatchObject({
      success: false,
      error: 'sem chave',
    });
  });

  it('when a transient error passes, should retry after the configured wait and warn the caller', async () => {
    attempt.mockRejectedValueOnce(transient()).mockResolvedValueOnce(answer());
    const onRetry = jest.fn();

    await runResilientChat(backend, usage, { message: 'a', model: 'caro', onRetry });

    expect(attempt).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
    expect(onRetry).toHaveBeenCalledWith({
      attempt: 2,
      maxAttempts: 3,
      delayMs: 10,
      reason: 'motivo 503',
    });
  });

  it('when a model stays unavailable, should switch once to the cheapest and say so', async () => {
    attempt
      .mockRejectedValueOnce(transient())
      .mockRejectedValueOnce(transient())
      .mockRejectedValueOnce(transient())
      .mockResolvedValueOnce(answer());
    const onRetry = jest.fn();

    await runResilientChat(backend, usage, { message: 'a', model: 'caro', onRetry });

    expect(attempt).toHaveBeenCalledTimes(4);
    expect(attempt.mock.calls[3][0]).toBe('barato');
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({ fallback: true, reason: 'motivo 503' }),
    );
    expect(usage.getUsage().recentRequests[0]).toMatchObject({ model: 'barato', estimatedCost: 2 });
  });

  it('when the cheapest model is already the chosen one, should not switch', async () => {
    attempt.mockRejectedValue(transient());

    await expect(
      runResilientChat(backend, usage, { message: 'a', model: 'barato' }),
    ).rejects.toThrow('motivo 503');

    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('when the model is not in the catalog, should not switch', async () => {
    attempt.mockRejectedValue(transient());

    await expect(
      runResilientChat(backend, usage, { message: 'a', model: 'desconhecido' }),
    ).rejects.toThrow();

    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('when the error is not transient, should not retry or switch', async () => {
    attempt.mockRejectedValue(fatal());

    await expect(runResilientChat(backend, usage, { message: 'a', model: 'caro' })).rejects.toThrow(
      'motivo 401',
    );

    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('when the user cancelled, should not retry or switch', async () => {
    const controller = new AbortController();

    attempt.mockImplementation(() => {
      controller.abort();

      return Promise.reject(transient());
    });

    await expect(
      runResilientChat(backend, usage, { message: 'a', model: 'caro', signal: controller.signal }),
    ).rejects.toThrow();

    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('when everything fails, should record one failure with the reason and keep the original error as cause', async () => {
    const original = transient();

    attempt.mockRejectedValue(original);

    await expect(
      runResilientChat(backend, usage, { message: 'a', model: 'caro' }),
    ).rejects.toMatchObject({
      message: 'motivo 503',
      cause: original,
    });

    expect(attempt).toHaveBeenCalledTimes(6);
    expect(usage.getUsage().recentRequests).toHaveLength(1);
    expect(usage.getUsage().recentRequests[0]).toMatchObject({
      success: false,
      error: 'motivo 503',
      model: 'caro',
    });
  });
});
