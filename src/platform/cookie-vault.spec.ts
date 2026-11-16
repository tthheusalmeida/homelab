import { CookieVault } from './cookie-vault';

const NOW = 1_800_000_000_000;

function build(initial: string | null = null) {
  let stored = initial;
  const secrets = {
    get: jest.fn(async () => stored),
    set: jest.fn(async (_key: string, value: string) => {
      stored = value;
    }),
  };

  return { vault: new CookieVault(secrets as never, () => NOW), secrets };
}

describe('CookieVault', () => {
  it('when nothing was saved, should load an empty list', async () => {
    await expect(build().vault.load()).resolves.toEqual([]);
  });

  it('when cookies are saved, should load them back through the encrypted store', async () => {
    const { vault, secrets } = build();

    await vault.save([{ name: 'sid', value: 'abc', domain: '.curso.edu', extra: 1 } as never]);

    expect(secrets.set).toHaveBeenCalledWith('platform.cookies', expect.any(String));
    await expect(vault.load()).resolves.toEqual([
      expect.objectContaining({ name: 'sid', value: 'abc', domain: '.curso.edu' }),
    ]);
    expect(JSON.stringify(await vault.load())).not.toContain('extra');
  });

  it('when a saved cookie already expired, should not load it', async () => {
    const { vault } = build();

    await vault.save([
      { name: 'old', value: '1', domain: 'a.com', expirationDate: NOW / 1000 - 10 },
      { name: 'new', value: '2', domain: 'a.com', expirationDate: NOW / 1000 + 1000 },
      { name: 'session', value: '3', domain: 'a.com' },
    ]);

    const names = (await vault.load()).map((cookie) => cookie.name);

    expect(names).toEqual(['new', 'session']);
  });

  it('when the stored text is corrupted, should load an empty list', async () => {
    await expect(build('{não é json').vault.load()).resolves.toEqual([]);
  });
});
