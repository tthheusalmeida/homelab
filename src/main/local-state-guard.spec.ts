import { LocalStateGuard } from './local-state-guard';

const withKey = '{"os_crypt":{"encrypted_key":"abc"}}';

function build(reads: Array<string | null>, timeoutMs = 1000) {
  const readFile = jest.fn(() => (reads.length > 1 ? reads.shift()! : reads[0]));
  const sleep = jest.fn(() => Promise.resolve());
  const guard = new LocalStateGuard({
    userDataDir: 'x',
    timeoutMs,
    intervalMs: 250,
    readFile,
    sleep,
  });

  return { guard, readFile, sleep };
}

describe('LocalStateGuard', () => {
  it('when the key is already on disk, should resolve true without waiting', async () => {
    const { guard, sleep } = build([withKey]);

    await expect(guard.waitUntilPersisted()).resolves.toBe(true);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('when the file appears after some polls, should wait and resolve true', async () => {
    const { guard, sleep } = build([null, '{}', withKey]);

    await expect(guard.waitUntilPersisted()).resolves.toBe(true);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('when the key never shows up, should give up after the timeout and resolve false', async () => {
    const { guard, sleep } = build([null], 1000);

    await expect(guard.waitUntilPersisted()).resolves.toBe(false);
    expect(sleep).toHaveBeenCalledTimes(5);
  });

  it('when the file has no encrypted key, should not count as persisted', () => {
    const { guard } = build(['{"other":1}']);

    expect(guard.isPersisted()).toBe(false);
  });
});
