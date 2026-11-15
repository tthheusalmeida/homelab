import { waitForBackend } from './backend-ready';

const base = { url: 'http://x/health', retries: 3, delayMs: 10 };

describe('waitForBackend', () => {
  it('when the first call is ok, should return true without waiting', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const fetchFn = jest.fn().mockResolvedValue({ ok: true });

    await expect(waitForBackend({ ...base, fetchFn, sleep })).resolves.toBe(true);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('when the back fails then recovers, should retry and return true', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const fetchFn = jest
      .fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true });

    await expect(waitForBackend({ ...base, fetchFn, sleep })).resolves.toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it('when attempts run out, should return false', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const fetchFn = jest.fn().mockRejectedValue(new Error('down'));

    await expect(waitForBackend({ ...base, fetchFn, sleep })).resolves.toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });
});
