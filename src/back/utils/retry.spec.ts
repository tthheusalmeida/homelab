import { withRetry } from './retry';

describe('withRetry', () => {
  const base = { maxAttempts: 3, delaysMs: [10, 20], isRetryable: () => true };

  it('when the first attempt works, should return it without waiting or notifying', async () => {
    const sleep = jest.fn();
    const onRetry = jest.fn();

    await expect(withRetry(async () => 'ok', { ...base, sleep, onRetry })).resolves.toBe('ok');
    expect(sleep).not.toHaveBeenCalled();
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('when a transient error happens once, should retry after the first delay and return', async () => {
    const run = jest.fn().mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce('ok');
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(withRetry(run, { ...base, sleep })).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it('when it keeps failing, should try the maximum, use growing delays and throw the last error', async () => {
    const run = jest
      .fn()
      .mockRejectedValueOnce(new Error('e1'))
      .mockRejectedValueOnce(new Error('e2'))
      .mockRejectedValueOnce(new Error('e3'));
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(withRetry(run, { ...base, sleep })).rejects.toThrow('e3');
    expect(run).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([10, 20]);
  });

  it('when a retry is about to start, should tell the attempt number, the total and the reason', async () => {
    const error = new Error('e1');
    const run = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');
    const onRetry = jest.fn();

    await withRetry(run, { ...base, sleep: async () => undefined, onRetry });

    expect(onRetry).toHaveBeenCalledWith({ attempt: 2, maxAttempts: 3, delayMs: 10, error });
  });

  it('when the error is not transient, should throw at once without retrying', async () => {
    const run = jest.fn().mockRejectedValue(new Error('definitivo'));
    const sleep = jest.fn();

    await expect(withRetry(run, { ...base, isRetryable: () => false, sleep })).rejects.toThrow(
      'definitivo',
    );
    expect(run).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('when there are more retries than delays, should reuse the last delay', async () => {
    const run = jest.fn().mockRejectedValue(new Error('x'));
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(
      withRetry(run, { maxAttempts: 4, delaysMs: [5], isRetryable: () => true, sleep }),
    ).rejects.toThrow('x');
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([5, 5, 5]);
  });

  it('when only one attempt is allowed, should never retry', async () => {
    const run = jest.fn().mockRejectedValue(new Error('x'));

    await expect(
      withRetry(run, { ...base, maxAttempts: 1, sleep: async () => undefined }),
    ).rejects.toThrow('x');
    expect(run).toHaveBeenCalledTimes(1);
  });
});
